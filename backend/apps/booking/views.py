import json
import logging
from datetime import datetime, time, timedelta

from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, status
from rest_framework.filters import SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.services import create_in_app_notification
from apps.users.models import User
from apps.users.permissions import IsManagerOrHigher
from .models import Booking, Service
from .serializers import BLOCKING_STATUSES, BookingSerializer, PublicBookingSerializer, ServiceSerializer

logger = logging.getLogger(__name__)

WORKDAY_START_HOUR = 8
WORKDAY_END_HOUR = 22
SLOT_MINUTES = 30


def notify_managers_about_booking(booking):
    managers = User.objects.filter(
        Q(role__in=[User.ROLE_MANAGER, User.ROLE_DIRECTOR, User.ROLE_ADMIN])
        | Q(is_staff=True)
        | Q(is_superuser=True)
    ).distinct()
    title = 'Новая заявка на запись' if booking.status == Booking.STATUS_PENDING else 'Новая запись'
    message = f'{booking.contact_name} записан на {booking.service.name} ({booking.start_time})'
    for manager in managers:
        try:
            create_in_app_notification(
                user=manager,
                title=title,
                message=message,
                link='/bookings',
            )
        except Exception:
            logger.exception('Failed to notify manager %s about booking %s', manager.pk, booking.pk)


def get_public_week_start(raw_value):
    if raw_value:
        try:
            current = datetime.strptime(raw_value, '%Y-%m-%d').date()
        except ValueError:
            current = timezone.localdate()
    else:
        current = timezone.localdate()
    return current - timedelta(days=current.weekday())


def build_public_availability(service, week_start):
    tz = timezone.get_current_timezone()
    now = timezone.localtime(timezone.now(), tz)
    week_end = week_start + timedelta(days=7)
    week_start_dt = timezone.make_aware(datetime.combine(week_start, time(WORKDAY_START_HOUR, 0)), tz)
    week_end_dt = timezone.make_aware(datetime.combine(week_end, time(WORKDAY_START_HOUR, 0)), tz)

    busy_bookings = list(
        Booking.objects.filter(
            status__in=BLOCKING_STATUSES,
            start_time__lt=week_end_dt,
            end_time__gt=week_start_dt,
        ).only('start_time', 'end_time')
    )

    latest_start_minutes = WORKDAY_END_HOUR * 60 - service.duration_minutes
    slot_minutes = range(WORKDAY_START_HOUR * 60, latest_start_minutes + 1, SLOT_MINUTES)
    days = [week_start + timedelta(days=index) for index in range(7)]

    rows = []
    for minute_offset in slot_minutes:
        hour = minute_offset // 60
        minute = minute_offset % 60
        row = {
            'time': f'{hour:02d}:{minute:02d}',
            'cells': [],
        }
        for day in days:
            slot_start = timezone.make_aware(datetime.combine(day, time(hour, minute)), tz)
            slot_end = slot_start + timedelta(minutes=service.duration_minutes)
            is_past = slot_start <= now
            is_busy = any(
                booking.start_time < slot_end and booking.end_time > slot_start
                for booking in busy_bookings
            )
            row['cells'].append({
                'start_time': slot_start.isoformat(),
                'available': not is_past and not is_busy,
                'is_past': is_past,
                'is_busy': is_busy,
            })
        rows.append(row)

    return {
        'service': {
            'id': service.id,
            'name': service.name,
            'duration_minutes': service.duration_minutes,
            'price': float(service.price),
        },
        'week_start': week_start.isoformat(),
        'days': [{'date': day.isoformat()} for day in days],
        'rows': rows,
    }


class ServiceListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsManagerOrHigher()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.is_manager:
            return Service.objects.all()
        return Service.objects.filter(is_active=True)


class ServiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [IsManagerOrHigher]


class BookingListCreateView(generics.ListCreateAPIView):
    serializer_class = BookingSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'service', 'start_time']

    def get_queryset(self):
        if self.request.user.is_manager:
            return Booking.objects.select_related('client', 'service').all()
        return Booking.objects.none()

    def perform_create(self, serializer):
        booking = serializer.save()
        notify_managers_about_booking(booking)
        return booking


class BookingDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Booking.objects.select_related('client', 'service').all()
    serializer_class = BookingSerializer
    permission_classes = [IsManagerOrHigher]


class PublicBookingCreateView(generics.CreateAPIView):
    queryset = Booking.objects.all()
    serializer_class = PublicBookingSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        booking = serializer.save()
        notify_managers_about_booking(booking)
        return booking


class PublicBookingAvailabilityView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        service_id = request.query_params.get('service_id')
        if not service_id:
            return Response({'detail': 'service_id required'}, status=status.HTTP_400_BAD_REQUEST)

        service = get_object_or_404(Service.objects.filter(is_active=True), pk=service_id)
        week_start = get_public_week_start(request.query_params.get('week_start'))
        return Response(build_public_availability(service, week_start))


@method_decorator(xframe_options_exempt, name='dispatch')
class BookingWidgetView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        services = json.dumps(
            list(Service.objects.filter(is_active=True).values('id', 'name', 'duration_minutes', 'price')),
            ensure_ascii=False,
            cls=DjangoJSONEncoder,
        )
        html = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Запись в студию</title>
<style>
  :root {
    --bg: #f4f7fb;
    --panel: #ffffff;
    --line: #d8e1ef;
    --text: #10203a;
    --muted: #607089;
    --primary: #1d6fff;
    --primary-dark: #1457ca;
    --primary-soft: #ecf3ff;
    --success-bg: #e9f9ef;
    --success-text: #176a43;
    --error-bg: #fff3f1;
    --error-text: #af3027;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Inter, "Segoe UI", Arial, sans-serif;
    color: var(--text);
    background:
      radial-gradient(circle at top left, rgba(29,111,255,0.1), transparent 32%),
      linear-gradient(180deg, rgba(29,111,255,0.05), transparent 220px),
      var(--bg);
  }
  .widget {
    max-width: 1180px;
    margin: 0 auto;
    padding: 24px;
  }
  .hero {
    margin-bottom: 20px;
  }
  .hero h1 {
    margin: 0;
    font-size: clamp(34px, 5vw, 70px);
    line-height: 0.92;
    letter-spacing: -0.06em;
    text-transform: uppercase;
    font-weight: 900;
  }
  .hero p {
    max-width: 640px;
    margin: 14px 0 0;
    color: var(--muted);
    font-size: 15px;
    line-height: 1.6;
  }
  .bar {
    width: min(84%, 820px);
    height: 18px;
    margin-top: 8px;
    background: var(--primary);
  }
  .shell {
    border: 1px solid var(--line);
    background: var(--panel);
  }
  .steps {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-bottom: 1px solid var(--line);
  }
  .step {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 18px;
    border-right: 1px solid var(--line);
    background: #fbfdff;
  }
  .step:last-child { border-right: 0; }
  .step-index {
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--line);
    font-size: 13px;
    font-weight: 800;
  }
  .step.active .step-index,
  .step.done .step-index {
    background: var(--primary);
    border-color: var(--primary);
    color: #fff;
  }
  .step-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    font-weight: 700;
  }
  .step-title {
    margin-top: 4px;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.03em;
  }
  .panel {
    display: none;
    padding: 22px;
  }
  .panel.active { display: block; }
  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
  }
  .section-head h2 {
    margin: 0;
    font-size: 28px;
    line-height: 1;
    letter-spacing: -0.05em;
    text-transform: uppercase;
  }
  .section-head p {
    margin: 8px 0 0;
    color: var(--muted);
    font-size: 14px;
  }
  .service-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .service-card {
    border: 1px solid var(--line);
    background: #fff;
    padding: 18px;
    cursor: pointer;
    transition: 160ms ease;
    text-align: left;
  }
  .service-card:hover,
  .service-card.active {
    border-color: var(--primary);
    background: var(--primary-soft);
    box-shadow: 0 14px 28px rgba(29, 111, 255, 0.08);
  }
  .service-name {
    font-size: 17px;
    font-weight: 900;
    letter-spacing: -0.02em;
  }
  .service-meta {
    margin-top: 8px;
    color: var(--muted);
    font-size: 14px;
  }
  .service-empty,
  .empty {
    border: 1px dashed var(--line);
    padding: 18px;
    background: #fbfdff;
    color: var(--muted);
  }
  .summary-card {
    padding: 16px 18px;
    border: 1px solid var(--line);
    background: #fbfdff;
    margin-bottom: 16px;
  }
  .summary-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    font-weight: 700;
  }
  .summary-value {
    margin-top: 6px;
    font-size: 18px;
    font-weight: 900;
    letter-spacing: -0.03em;
  }
  .schedule-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }
  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .toolbar-button,
  .ghost-button {
    min-height: 46px;
    border: 1px solid var(--line);
    background: #fff;
    color: var(--text);
    padding: 0 16px;
    cursor: pointer;
    font-weight: 700;
  }
  .toolbar-button:hover,
  .ghost-button:hover {
    border-color: var(--primary);
    color: var(--primary);
  }
  .primary-button {
    min-height: 52px;
    border: 0;
    background: var(--primary);
    color: #fff;
    padding: 0 18px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .primary-button:hover { background: var(--primary-dark); }
  .primary-button:disabled,
  .toolbar-button:disabled,
  .ghost-button:disabled {
    cursor: default;
    opacity: 0.5;
  }
  .schedule-wrap {
    overflow-x: auto;
    border: 1px solid var(--line);
  }
  .schedule-grid {
    min-width: 920px;
  }
  .schedule-head,
  .schedule-row {
    display: grid;
    grid-template-columns: 92px repeat(7, minmax(108px, 1fr));
  }
  .schedule-head > div,
  .schedule-row > div {
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }
  .schedule-head > div:last-child,
  .schedule-row > div:last-child { border-right: 0; }
  .time-cell,
  .day-cell {
    background: #fbfdff;
    padding: 12px 10px;
  }
  .time-cell {
    font-size: 12px;
    font-weight: 800;
    color: var(--muted);
    text-align: center;
  }
  .day-cell {
    text-align: center;
  }
  .day-title {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
  }
  .day-date {
    margin-top: 6px;
    font-size: 18px;
    font-weight: 900;
    letter-spacing: -0.03em;
  }
  .slot-cell {
    min-height: 64px;
    padding: 6px;
    background: #fff;
  }
  .slot-button,
  .slot-blocked {
    width: 100%;
    min-height: 50px;
    border: 1px solid var(--line);
    padding: 8px;
    font-weight: 700;
  }
  .slot-button {
    background: #fff;
    cursor: pointer;
  }
  .slot-button:hover,
  .slot-button.selected {
    border-color: var(--primary);
    background: var(--primary-soft);
    color: var(--primary);
  }
  .slot-blocked {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f7f8fb;
    color: #a0aab9;
    font-size: 12px;
  }
  .form-grid {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .field-wide { grid-column: 1 / -1; }
  label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    font-weight: 700;
  }
  input,
  textarea {
    width: 100%;
    min-height: 54px;
    border: 1px solid var(--line);
    padding: 14px 16px;
    font-size: 16px;
    color: var(--text);
    background: #fff;
    outline: none;
  }
  textarea {
    min-height: 120px;
    resize: vertical;
  }
  input:focus,
  textarea:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(29,111,255,0.12);
  }
  .field-error {
    min-height: 18px;
    color: var(--error-text);
    font-size: 13px;
  }
  .actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 18px;
  }
  .message {
    display: none;
    margin-top: 16px;
    padding: 14px 16px;
    font-size: 14px;
  }
  .message.show { display: block; }
  .message.error {
    background: var(--error-bg);
    color: var(--error-text);
  }
  .success-card {
    border: 1px solid var(--line);
    background: linear-gradient(180deg, #ffffff, #f5fbf7);
    padding: 28px;
  }
  .success-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 64px;
    min-height: 64px;
    background: var(--success-bg);
    color: var(--success-text);
    font-size: 32px;
    font-weight: 900;
  }
  .success-card h2 {
    margin: 18px 0 8px;
    font-size: 32px;
    line-height: 1;
    letter-spacing: -0.05em;
    text-transform: uppercase;
  }
  .success-card p {
    margin: 0;
    color: var(--muted);
    line-height: 1.6;
  }
  .success-list {
    margin: 18px 0 0;
    padding: 0;
    list-style: none;
  }
  .success-list li {
    padding: 10px 0;
    border-top: 1px solid var(--line);
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }
  .success-list span:first-child {
    color: var(--muted);
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.08em;
    font-weight: 700;
  }
  .success-list span:last-child {
    text-align: right;
    font-weight: 800;
  }
  @media (max-width: 920px) {
    .widget { padding: 14px; }
    .steps { grid-template-columns: 1fr; }
    .step { border-right: 0; border-bottom: 1px solid var(--line); }
    .step:last-child { border-bottom: 0; }
    .service-grid,
    .form-grid { grid-template-columns: 1fr; }
    .actions,
    .schedule-toolbar { flex-direction: column; align-items: stretch; }
    .toolbar-group { justify-content: space-between; }
  }
</style>
</head>
<body>
<div class="widget">
  <div class="hero">
    <h1>Запись в студию</h1>
    <div class="bar"></div>
    <p>Сначала выберите услугу, затем свободный слот в шахматке, после этого оставьте контактные данные. Заявка уйдет менеджеру на согласование, и мы быстро свяжемся с вами для подтверждения.</p>
  </div>

  <div class="shell">
    <div class="steps" id="stepper">
      <div class="step active" data-step="1">
        <div class="step-index">01</div>
        <div>
          <div class="step-label">Шаг</div>
          <div class="step-title">Услуга</div>
        </div>
      </div>
      <div class="step" data-step="2">
        <div class="step-index">02</div>
        <div>
          <div class="step-label">Шаг</div>
          <div class="step-title">Шахматка</div>
        </div>
      </div>
      <div class="step" data-step="3">
        <div class="step-index">03</div>
        <div>
          <div class="step-label">Шаг</div>
          <div class="step-title">Контакты</div>
        </div>
      </div>
      <div class="step" data-step="4">
        <div class="step-index">04</div>
        <div>
          <div class="step-label">Шаг</div>
          <div class="step-title">Готово</div>
        </div>
      </div>
    </div>

    <section class="panel active" id="step1Panel">
      <div class="section-head">
        <div>
          <h2>Выберите услугу</h2>
          <p>Начните с услуги. После выбора откроется шахматка с реальными занятыми и свободными слотами.</p>
        </div>
      </div>
      <div class="service-grid" id="servicesGrid"></div>
    </section>

    <section class="panel" id="step2Panel">
      <div class="section-head">
        <div>
          <h2>Выберите слот</h2>
          <p>Занятые интервалы закрыты. Свободные ячейки можно выбрать сразу.</p>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Услуга</div>
        <div class="summary-value" id="selectedServiceSummary">—</div>
      </div>
      <div class="schedule-toolbar">
        <div class="toolbar-group">
          <button type="button" class="toolbar-button" id="prevWeekButton">Предыдущая неделя</button>
          <button type="button" class="toolbar-button" id="nextWeekButton">Следующая неделя</button>
        </div>
        <div class="summary-label" id="weekLabel">—</div>
      </div>
      <div class="schedule-wrap">
        <div class="schedule-grid" id="scheduleGrid"></div>
      </div>
      <div class="actions">
        <button type="button" class="ghost-button" id="backToServicesButton">Назад</button>
        <button type="button" class="primary-button" id="continueToClientButton" disabled>Продолжить</button>
      </div>
    </section>

    <section class="panel" id="step3Panel">
      <div class="section-head">
        <div>
          <h2>Данные клиента</h2>
          <p>Отправляем заявку на согласование менеджеру. Клиент будет создан только после подтверждения записи.</p>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Выбранный слот</div>
        <div class="summary-value" id="selectedSlotSummary">—</div>
      </div>
      <form id="bookingForm">
        <input type="hidden" name="service_id" id="serviceInput" required>
        <input type="hidden" name="start_time" id="startTimeInput" required>
        <div class="form-grid">
          <div class="field">
            <label for="clientName">Имя</label>
            <input id="clientName" type="text" name="client_name" placeholder="Ваше имя" autocomplete="name" required>
            <div class="field-error" id="nameError"></div>
          </div>
          <div class="field">
            <label for="clientPhone">Телефон</label>
            <input id="clientPhone" type="tel" name="client_phone" placeholder="+7 999 999 99 99" inputmode="numeric" maxlength="16" autocomplete="tel" required>
            <div class="field-error" id="phoneError"></div>
          </div>
          <div class="field field-wide">
            <label for="notes">Комментарий</label>
            <textarea id="notes" name="notes" placeholder="Например: состав съемки, количество гостей, дополнительные пожелания"></textarea>
          </div>
        </div>
        <div class="actions">
          <button type="button" class="ghost-button" id="backToScheduleButton">Назад</button>
          <button type="submit" class="primary-button">Отправить заявку</button>
        </div>
      </form>
      <div id="message" class="message"></div>
    </section>

    <section class="panel" id="step4Panel">
      <div class="success-card">
        <div class="success-badge">✓</div>
        <h2>Спасибо</h2>
        <p>Заявка принята и уже отправлена менеджеру на согласование. Скоро с вами свяжутся для подтверждения записи.</p>
        <ul class="success-list">
          <li><span>Услуга</span><span id="successService">—</span></li>
          <li><span>Дата и время</span><span id="successTime">—</span></li>
          <li><span>Статус</span><span>На согласовании</span></li>
        </ul>
      </div>
    </section>
  </div>
</div>

<script>
  const services = __SERVICES__;
  const availabilityUrl = '__AVAILABILITY_URL__';
  const createUrl = '__CREATE_URL__';

  const serviceInput = document.getElementById('serviceInput');
  const startTimeInput = document.getElementById('startTimeInput');
  const servicesGrid = document.getElementById('servicesGrid');
  const scheduleGrid = document.getElementById('scheduleGrid');
  const selectedServiceSummary = document.getElementById('selectedServiceSummary');
  const selectedSlotSummary = document.getElementById('selectedSlotSummary');
  const messageNode = document.getElementById('message');
  const clientNameInput = document.getElementById('clientName');
  const clientPhoneInput = document.getElementById('clientPhone');
  const nameErrorNode = document.getElementById('nameError');
  const phoneErrorNode = document.getElementById('phoneError');
  const weekLabel = document.getElementById('weekLabel');
  const successService = document.getElementById('successService');
  const successTime = document.getElementById('successTime');
  const continueToClientButton = document.getElementById('continueToClientButton');

  const state = {
    step: 1,
    selectedService: null,
    selectedSlot: null,
    weekStart: null,
    availability: null,
  };

  const NAME_PATTERN = /^[A-Za-zА-Яа-яЁё]+(?:[ '-][A-Za-zА-Яа-яЁё]+)*$/;

  function normalizeName(value) {
    return String(value || '').replace(/\\s+/g, ' ').trim();
  }

  function validateName(value) {
    const normalized = normalizeName(value);
    if (normalized.length < 2) return 'Укажите имя не короче 2 символов.';
    if (!NAME_PATTERN.test(normalized)) return 'Имя может содержать только буквы, пробел, дефис и апостроф.';
    return '';
  }

  function getPhoneDigits(value) {
    return String(value || '').replace(/\\D/g, '');
  }

  function normalizePhone(value) {
    let digits = getPhoneDigits(value);
    if (!digits) return '';
    if (digits[0] === '8') digits = `7${digits.slice(1)}`;
    else if (digits[0] === '9') digits = `7${digits}`;
    else if (digits[0] !== '7') digits = `7${digits}`;
    return `+${digits.slice(0, 11)}`;
  }

  function formatPhone(value) {
    const normalized = normalizePhone(value);
    const digits = normalized.replace(/\\D/g, '');
    if (!digits) return '';

    const parts = ['+7'];
    if (digits.length > 1) parts.push(digits.slice(1, 4));
    if (digits.length > 4) parts.push(digits.slice(4, 7));
    if (digits.length > 7) parts.push(digits.slice(7, 9));
    if (digits.length > 9) parts.push(digits.slice(9, 11));
    return parts.join(' ');
  }

  function validatePhone(value) {
    return /^\\+7\\d{10}$/.test(normalizePhone(value)) ? '' : 'Телефон должен быть в формате +7 999 999 99 99.';
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString('ru-RU');
  }

  function formatDateTime(value) {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  function formatDayName(value) {
    return new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(new Date(value));
  }

  function formatDayDate(value) {
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(new Date(value));
  }

  function formatWeekLabel(dateString) {
    const start = new Date(dateString);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${formatDayDate(start)} - ${formatDayDate(end)}`;
  }

  function setStep(step) {
    state.step = step;
    document.querySelectorAll('.step').forEach((node) => {
      const nodeStep = Number(node.dataset.step);
      node.classList.toggle('active', nodeStep === step);
      node.classList.toggle('done', nodeStep < step);
    });
    document.querySelectorAll('.panel').forEach((node, index) => {
      node.classList.toggle('active', index + 1 === step);
    });
  }

  function setSelectedService(service) {
    state.selectedService = service;
    state.selectedSlot = null;
    serviceInput.value = service.id;
    startTimeInput.value = '';
    selectedServiceSummary.textContent = `${service.name} - ${formatMoney(service.price)} ₽ / ${service.duration_minutes} мин`;
    continueToClientButton.disabled = true;
    document.querySelectorAll('.service-card').forEach((card) => {
      card.classList.toggle('active', Number(card.dataset.serviceId) === service.id);
    });
  }

  function renderServices() {
    if (!services.length) {
      servicesGrid.innerHTML = '<div class="service-empty">Активные услуги пока не опубликованы. Вернитесь позже или свяжитесь со студией напрямую.</div>';
      return;
    }
    servicesGrid.innerHTML = '';
    services.forEach((service) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'service-card';
      card.dataset.serviceId = service.id;
      card.innerHTML = `
        <div class="service-name">${service.name}</div>
        <div class="service-meta">${formatMoney(service.price)} ₽ / ${service.duration_minutes} мин</div>
      `;
      card.addEventListener('click', async () => {
        setSelectedService(service);
        await loadAvailability();
        setStep(2);
      });
      servicesGrid.appendChild(card);
    });
  }

  async function parseResponseBody(res) {
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (_error) {
      return { detail: `Сервер вернул некорректный ответ (HTTP ${res.status}).` };
    }
  }

  function formatResponseMessage(payload, fallback) {
    if (!payload) return fallback;
    if (typeof payload === 'string') return payload;
    if (payload.detail && typeof payload.detail === 'string') return payload.detail;

    return Object.entries(payload)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join(' | ') || fallback;
  }

  async function loadAvailability() {
    if (!state.selectedService) return;

    const query = new URLSearchParams({ service_id: String(state.selectedService.id) });
    if (state.weekStart) query.set('week_start', state.weekStart);

    scheduleGrid.innerHTML = '<div class="empty">Загружаем актуальную занятость...</div>';

    const res = await fetch(`${availabilityUrl}?${query.toString()}`);
    const data = await parseResponseBody(res);
    if (!res.ok) {
      scheduleGrid.innerHTML = `<div class="empty">${formatResponseMessage(data, 'Не удалось загрузить свободные слоты.')}</div>`;
      return;
    }

    state.availability = data;
    state.weekStart = data.week_start;
    renderSchedule();
  }

  function selectSlot(slot) {
    state.selectedSlot = slot;
    startTimeInput.value = slot.start_time;
    selectedSlotSummary.textContent = `${state.selectedService.name}, ${formatDateTime(slot.start_time)}`;
    continueToClientButton.disabled = false;
    renderSchedule();
  }

  function renderSchedule() {
    if (!state.availability) {
      scheduleGrid.innerHTML = '<div class="empty">Нет данных по расписанию.</div>';
      return;
    }

    weekLabel.textContent = formatWeekLabel(state.availability.week_start);

    const head = document.createElement('div');
    head.className = 'schedule-head';
    head.innerHTML = '<div class="time-cell">Время</div>';
    state.availability.days.forEach((day) => {
      const dayNode = document.createElement('div');
      dayNode.className = 'day-cell';
      dayNode.innerHTML = `
        <div class="day-title">${formatDayName(day.date)}</div>
        <div class="day-date">${formatDayDate(day.date)}</div>
      `;
      head.appendChild(dayNode);
    });

    const wrapper = document.createElement('div');
    wrapper.appendChild(head);

    state.availability.rows.forEach((row) => {
      const rowNode = document.createElement('div');
      rowNode.className = 'schedule-row';

      const timeNode = document.createElement('div');
      timeNode.className = 'time-cell';
      timeNode.textContent = row.time;
      rowNode.appendChild(timeNode);

      row.cells.forEach((cell) => {
        const slotNode = document.createElement('div');
        slotNode.className = 'slot-cell';
        if (cell.available) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'slot-button';
          if (state.selectedSlot?.start_time === cell.start_time) {
            button.classList.add('selected');
          }
          button.textContent = 'Свободно';
          button.addEventListener('click', () => selectSlot(cell));
          slotNode.appendChild(button);
        } else {
          const blocked = document.createElement('div');
          blocked.className = 'slot-blocked';
          blocked.textContent = cell.is_past ? 'Прошло' : 'Занято';
          slotNode.appendChild(blocked);
        }
        rowNode.appendChild(slotNode);
      });

      wrapper.appendChild(rowNode);
    });

    scheduleGrid.innerHTML = '';
    scheduleGrid.appendChild(wrapper);
  }

  function showFormError(type, text) {
    messageNode.className = 'message show error';
    messageNode.textContent = text;
    if (type === 'client_name') nameErrorNode.textContent = text;
    if (type === 'client_phone') phoneErrorNode.textContent = text;
  }

  function clearFormErrors() {
    nameErrorNode.textContent = '';
    phoneErrorNode.textContent = '';
    messageNode.className = 'message';
    messageNode.textContent = '';
  }

  function fillSuccess() {
    successService.textContent = state.selectedService?.name || '—';
    successTime.textContent = state.selectedSlot ? formatDateTime(state.selectedSlot.start_time) : '—';
  }

  document.getElementById('prevWeekButton').addEventListener('click', async () => {
    if (!state.weekStart) return;
    const previous = new Date(state.weekStart);
    previous.setDate(previous.getDate() - 7);
    state.weekStart = previous.toISOString().slice(0, 10);
    state.selectedSlot = null;
    continueToClientButton.disabled = true;
    await loadAvailability();
  });

  document.getElementById('nextWeekButton').addEventListener('click', async () => {
    if (!state.weekStart) return;
    const next = new Date(state.weekStart);
    next.setDate(next.getDate() + 7);
    state.weekStart = next.toISOString().slice(0, 10);
    state.selectedSlot = null;
    continueToClientButton.disabled = true;
    await loadAvailability();
  });

  document.getElementById('backToServicesButton').addEventListener('click', () => {
    setStep(1);
  });

  document.getElementById('continueToClientButton').addEventListener('click', () => {
    if (!state.selectedSlot) return;
    setStep(3);
  });

  document.getElementById('backToScheduleButton').addEventListener('click', () => {
    setStep(2);
  });

  clientNameInput.addEventListener('input', () => {
    nameErrorNode.textContent = validateName(clientNameInput.value);
  });
  clientNameInput.addEventListener('blur', () => {
    clientNameInput.value = normalizeName(clientNameInput.value);
    nameErrorNode.textContent = validateName(clientNameInput.value);
  });
  clientPhoneInput.addEventListener('input', () => {
    clientPhoneInput.value = formatPhone(clientPhoneInput.value);
    phoneErrorNode.textContent = validatePhone(clientPhoneInput.value);
  });
  clientPhoneInput.addEventListener('blur', () => {
    clientPhoneInput.value = formatPhone(clientPhoneInput.value);
    phoneErrorNode.textContent = validatePhone(clientPhoneInput.value);
  });

  document.getElementById('bookingForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormErrors();

    clientNameInput.value = normalizeName(clientNameInput.value);
    clientPhoneInput.value = formatPhone(clientPhoneInput.value);

    const nameError = validateName(clientNameInput.value);
    const phoneError = validatePhone(clientPhoneInput.value);
    if (nameError || phoneError) {
      if (nameError) nameErrorNode.textContent = nameError;
      if (phoneError) phoneErrorNode.textContent = phoneError;
      return;
    }

    if (!state.selectedService || !state.selectedSlot) {
      showFormError('general', 'Сначала выберите услугу и свободный слот.');
      return;
    }

    const payload = {
      service_id: state.selectedService.id,
      start_time: state.selectedSlot.start_time,
      client_name: clientNameInput.value,
      client_phone: normalizePhone(clientPhoneInput.value),
      notes: document.getElementById('notes').value,
    };

    const res = await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await parseResponseBody(res);

    if (!res.ok) {
      if (data?.client_name) nameErrorNode.textContent = Array.isArray(data.client_name) ? data.client_name.join(', ') : data.client_name;
      if (data?.client_phone) phoneErrorNode.textContent = Array.isArray(data.client_phone) ? data.client_phone.join(', ') : data.client_phone;
      if (data?.start_time) {
        messageNode.className = 'message show error';
        messageNode.textContent = Array.isArray(data.start_time) ? data.start_time.join(', ') : data.start_time;
        await loadAvailability();
      } else {
        messageNode.className = 'message show error';
        messageNode.textContent = formatResponseMessage(data, `Не удалось отправить заявку (HTTP ${res.status}).`);
      }
      return;
    }

    fillSuccess();
    event.target.reset();
    clearFormErrors();
    setStep(4);
  });

  renderServices();
</script>
</body>
</html>"""
        html = (
            html.replace('__SERVICES__', services)
            .replace('__AVAILABILITY_URL__', '/api/booking/public-availability/')
            .replace('__CREATE_URL__', '/api/booking/public/')
        )
        return HttpResponse(html)
