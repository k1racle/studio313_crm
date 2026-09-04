import json
import logging
from datetime import datetime, time, timedelta
from pathlib import Path

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
from apps.payments.serializers import calculate_booking_payment_options
from apps.payments.tokens import build_booking_token
from apps.users.models import User
from apps.users.permissions import IsManagerOrHigher

from .models import Booking, Service
from .serializers import BLOCKING_STATUSES, BookingSerializer, PublicBookingSerializer, ServiceSerializer

logger = logging.getLogger(__name__)

WORKDAY_START_HOUR = 8
WORKDAY_END_HOUR = 22
PUBLIC_BOOKING_DURATION_MINUTES = 60
SLOT_MINUTES = PUBLIC_BOOKING_DURATION_MINUTES


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
    current_timezone = timezone.get_current_timezone()
    now = timezone.localtime(timezone.now(), current_timezone)
    week_end = week_start + timedelta(days=7)
    week_start_dt = timezone.make_aware(datetime.combine(week_start, time(WORKDAY_START_HOUR, 0)), current_timezone)
    week_end_dt = timezone.make_aware(datetime.combine(week_end, time(WORKDAY_START_HOUR, 0)), current_timezone)

    busy_bookings = list(
        Booking.objects.filter(
            status__in=BLOCKING_STATUSES,
            start_time__lt=week_end_dt,
            end_time__gt=week_start_dt,
        ).only('start_time', 'end_time')
    )

    latest_start_minutes = WORKDAY_END_HOUR * 60 - PUBLIC_BOOKING_DURATION_MINUTES
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
            slot_start = timezone.make_aware(datetime.combine(day, time(hour, minute)), current_timezone)
            slot_end = slot_start + timedelta(minutes=PUBLIC_BOOKING_DURATION_MINUTES)
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
            'duration_minutes': PUBLIC_BOOKING_DURATION_MINUTES,
            'price': float(service.price),
        },
        'week_start': week_start.isoformat(),
        'days': [{'date': day.isoformat()} for day in days],
        'rows': rows,
    }


def render_booking_widget_html(services_json):
    return Path(__file__).with_name('booking_widget.html').read_text(encoding='utf-8')

    return """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Виджет записи</title>
<style>
  :root {
    --bg: #f3f6fb;
    --panel: #ffffff;
    --line: #d7deeb;
    --text: #14233b;
    --muted: #66778f;
    --primary: #2458ff;
    --primary-soft: #eef3ff;
    --danger-bg: #fff1ef;
    --danger-text: #b53528;
    --success-bg: #e8f8ef;
    --success-text: #176944;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    width: 100%;
    background:
      radial-gradient(circle at top left, rgba(36,88,255,0.12), transparent 35%),
      linear-gradient(180deg, rgba(36,88,255,0.06), transparent 220px),
      var(--bg);
    color: var(--text);
    font-family: Inter, "Segoe UI", Arial, sans-serif;
  }
  .widget {
    width: min(100%, 1180px);
    margin: 0 auto;
    padding: clamp(16px, 3vw, 24px);
  }
  .hero h1 {
    margin: 0;
    font-size: clamp(34px, 5vw, 68px);
    line-height: 0.92;
    letter-spacing: -0.06em;
    text-transform: uppercase;
    font-weight: 900;
  }
  .hero p {
    max-width: 780px;
    margin: 14px 0 0;
    color: var(--muted);
    font-size: 15px;
    line-height: 1.65;
  }
  .bar {
    width: min(82%, 780px);
    height: 16px;
    margin: 10px 0 0;
    background: var(--primary);
  }
  .shell {
    margin-top: 18px;
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
    width: 36px;
    height: 36px;
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
    font-weight: 900;
    letter-spacing: -0.03em;
  }
  .panel {
    display: none;
    padding: 22px;
  }
  .panel.active { display: block; }
  .section-head {
    display: flex;
    align-items: flex-start;
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
    box-shadow: 0 14px 28px rgba(36, 88, 255, 0.08);
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
  .summary-card {
    margin-bottom: 16px;
    padding: 16px 18px;
    border: 1px solid var(--line);
    background: #fbfdff;
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
  .schedule-toolbar,
  .actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
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
  .primary-button:disabled,
  .toolbar-button:disabled,
  .ghost-button:disabled {
    cursor: default;
    opacity: 0.5;
  }
  .schedule-wrap {
    max-width: 100%;
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
  .day-cell { text-align: center; }
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
  .payment-options {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 6px;
  }
  .payment-option {
    display: block;
    border: 1px solid var(--line);
    background: #fff;
    padding: 14px;
    cursor: pointer;
  }
  .payment-option input { display: none; }
  .payment-option.active {
    border-color: var(--primary);
    background: var(--primary-soft);
  }
  .payment-option-title {
    display: block;
    font-size: 14px;
    font-weight: 900;
  }
  .payment-option-note {
    display: block;
    margin-top: 8px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
  }
  .message {
    display: none;
    margin-top: 16px;
    padding: 14px 16px;
    font-size: 14px;
  }
  .message.show { display: block; }
  .message.error {
    background: var(--danger-bg);
    color: var(--danger-text);
  }
  .field-error {
    min-height: 18px;
    color: var(--danger-text);
    font-size: 13px;
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
    .steps,
    .service-grid,
    .payment-options,
    .form-grid {
      grid-template-columns: 1fr;
    }
    .step {
      border-right: 0;
      border-bottom: 1px solid var(--line);
    }
    .step:last-child { border-bottom: 0; }
    .actions,
    .schedule-toolbar {
      flex-direction: column;
      align-items: stretch;
    }
    .toolbar-group {
      justify-content: space-between;
      width: 100%;
    }
  }
  @media (max-width: 720px) {
    .schedule-grid { min-width: 660px; }
    .schedule-head,
    .schedule-row {
      grid-template-columns: 72px repeat(7, minmax(82px, 1fr));
    }
    .success-list li {
      flex-direction: column;
      gap: 6px;
    }
    .success-list span:last-child { text-align: left; }
  }
</style>
</head>
<body>
<div class="widget">
  <div class="hero">
    <h1>Запись в студию</h1>
    <div class="bar"></div>
    <p>Выберите услугу, затем свободный слот в расписании, после этого оставьте контакты. Можно оформить просто заявку, либо сразу перейти к частичной или полной оплате через YooKassa.</p>
  </div>

  <div class="shell">
    <div class="steps">
      <div class="step active" data-step="1">
        <div class="step-index">01</div>
        <div><div class="step-label">Шаг</div><div class="step-title">Услуга</div></div>
      </div>
      <div class="step" data-step="2">
        <div class="step-index">02</div>
        <div><div class="step-label">Шаг</div><div class="step-title">Расписание</div></div>
      </div>
      <div class="step" data-step="3">
        <div class="step-index">03</div>
        <div><div class="step-label">Шаг</div><div class="step-title">Контакты и оплата</div></div>
      </div>
      <div class="step" data-step="4">
        <div class="step-index">04</div>
        <div><div class="step-label">Шаг</div><div class="step-title">Готово</div></div>
      </div>
    </div>

    <section class="panel active" id="step1Panel">
      <div class="section-head">
        <div>
          <h2>Выберите услугу</h2>
          <p>Стоимость и длительность отображаются сразу, чтобы можно было выбрать формат записи.</p>
        </div>
      </div>
      <div class="service-grid" id="servicesGrid"></div>
    </section>

    <section class="panel" id="step2Panel">
      <div class="section-head">
        <div>
          <h2>Выберите слот</h2>
          <p>Показываем только свободное время. Неделя переключается кнопками.</p>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Выбрано</div>
        <div class="summary-value" id="selectedServiceSummary">Услуга еще не выбрана</div>
        <div class="summary-value" id="selectedSlotSummary" style="font-size: 16px; margin-top: 10px;">Слот еще не выбран</div>
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
      <div class="actions" style="margin-top: 18px;">
        <button type="button" class="ghost-button" id="backToServicesButton">Назад</button>
        <button type="button" class="primary-button" id="continueToClientButton" disabled>Продолжить</button>
      </div>
    </section>

    <section class="panel" id="step3Panel">
      <div class="section-head">
        <div>
          <h2>Контакты и оплата</h2>
          <p>Оставьте контакты. Можно просто отправить заявку, либо сразу перейти к оплате через YooKassa.</p>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Запись</div>
        <div class="summary-value" id="clientStepSummary">Услуга и слот еще не выбраны</div>
      </div>
      <form id="bookingForm">
        <div class="form-grid">
          <div class="field">
            <label for="clientName">Имя</label>
            <input id="clientName" type="text" autocomplete="name" required>
            <div class="field-error" id="nameError"></div>
          </div>
          <div class="field">
            <label for="clientPhone">Телефон</label>
            <input id="clientPhone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="+7 999 999 99 99" maxlength="16" required>
            <div class="field-error" id="phoneError"></div>
          </div>
          <div class="field field-wide">
            <label for="clientEmail">Email</label>
            <input id="clientEmail" type="email" autocomplete="email" placeholder="Для отправки ссылки или чека">
          </div>
          <div class="field field-wide">
            <label>Формат оформления</label>
            <div class="payment-options" id="paymentOptions">
              <label class="payment-option active" data-mode="request">
                <input type="radio" name="paymentMode" value="request" checked>
                <span class="payment-option-title">Только заявка</span>
                <span class="payment-option-note">Менеджер свяжется с вами и подтвердит запись вручную.</span>
              </label>
              <label class="payment-option" data-mode="partial">
                <input type="radio" name="paymentMode" value="partial">
                <span class="payment-option-title" id="partialTitle">Оплатить 50%</span>
                <span class="payment-option-note" id="partialNote">Предоплата рассчитывается от стоимости услуги.</span>
              </label>
              <label class="payment-option" data-mode="full">
                <input type="radio" name="paymentMode" value="full">
                <span class="payment-option-title" id="fullTitle">Оплатить 100%</span>
                <span class="payment-option-note" id="fullNote">Полная оплата услуги онлайн.</span>
              </label>
            </div>
          </div>
          <div class="field field-wide">
            <label for="notes">Комментарий</label>
            <textarea id="notes" placeholder="Например: состав съемки, количество гостей, дополнительные пожелания"></textarea>
          </div>
        </div>
        <div class="actions" style="margin-top: 18px;">
          <button type="button" class="ghost-button" id="backToScheduleButton">Назад</button>
          <button type="submit" class="primary-button" id="submitButton">Оформить</button>
        </div>
      </form>
      <div id="message" class="message"></div>
    </section>

    <section class="panel" id="step4Panel">
      <div class="success-card">
        <div class="success-badge">✓</div>
        <h2>Заявка принята</h2>
        <p>Мы получили запись и передали ее менеджеру. Если вы выбрали оплату, сейчас откроется страница YooKassa.</p>
        <ul class="success-list">
          <li><span>Услуга</span><span id="successService">—</span></li>
          <li><span>Дата и время</span><span id="successTime">—</span></li>
          <li><span>Формат</span><span id="successMode">Заявка</span></li>
        </ul>
      </div>
    </section>
  </div>
</div>

<script>
  const services = __SERVICES__;
  const availabilityUrl = '__AVAILABILITY_URL__';
  const createUrl = '__CREATE_URL__';
  const paymentCreateUrl = '__PAYMENT_CREATE_URL__';
  const widgetResizeMessageType = 'studio313:widget-resize';
  const NAME_PATTERN = /^[A-Za-zА-Яа-яЁё]+(?:[ '-][A-Za-zА-Яа-яЁё]+)*$/;

  const state = {
    step: 1,
    selectedService: null,
    selectedSlot: null,
    weekStart: null,
    availability: null,
  };

  const servicesGrid = document.getElementById('servicesGrid');
  const scheduleGrid = document.getElementById('scheduleGrid');
  const selectedServiceSummary = document.getElementById('selectedServiceSummary');
  const selectedSlotSummary = document.getElementById('selectedSlotSummary');
  const clientStepSummary = document.getElementById('clientStepSummary');
  const continueToClientButton = document.getElementById('continueToClientButton');
  const weekLabel = document.getElementById('weekLabel');
  const messageNode = document.getElementById('message');
  const clientNameInput = document.getElementById('clientName');
  const clientPhoneInput = document.getElementById('clientPhone');
  const clientEmailInput = document.getElementById('clientEmail');
  const nameErrorNode = document.getElementById('nameError');
  const phoneErrorNode = document.getElementById('phoneError');
  const submitButton = document.getElementById('submitButton');

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

  function getDocumentHeight() {
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.documentElement.clientHeight,
    );
  }

  function postWidgetSize() {
    if (window.parent === window) return;
    window.parent.postMessage({
      type: widgetResizeMessageType,
      height: getDocumentHeight(),
    }, '*');
  }

  let resizeFrame = null;

  function queueWidgetResize() {
    if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      postWidgetSize();
    });
  }

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(() => queueWidgetResize());
    resizeObserver.observe(document.documentElement);
    resizeObserver.observe(document.body);
  }

  const mutationObserver = new MutationObserver(() => queueWidgetResize());
  mutationObserver.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
  window.addEventListener('resize', queueWidgetResize);
  window.addEventListener('load', queueWidgetResize);
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'studio313:widget-parent-ready') {
      queueWidgetResize();
    }
  });

  async function parseResponseBody(response) {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (_error) {
      return { detail: `Сервер вернул некорректный ответ (HTTP ${response.status}).` };
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

  function showError(text) {
    messageNode.className = 'message show error';
    messageNode.textContent = text;
    queueWidgetResize();
  }

  function clearErrors() {
    messageNode.className = 'message';
    messageNode.textContent = '';
    nameErrorNode.textContent = '';
    phoneErrorNode.textContent = '';
    queueWidgetResize();
  }

  function getPaymentMode() {
    return document.querySelector('input[name="paymentMode"]:checked')?.value || 'request';
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
    queueWidgetResize();
  }

  function updatePaymentLabels() {
    if (!state.selectedService) return;
    const price = Number(state.selectedService.price || 0);
    const partial = Math.ceil(price * 0.5 * 100) / 100;
    document.getElementById('partialTitle').textContent = `Оплатить 50% - ${formatMoney(partial)} ₽`;
    document.getElementById('partialNote').textContent = `Предоплата 50% от стоимости ${formatMoney(price)} ₽.`;
    document.getElementById('fullTitle').textContent = `Оплатить 100% - ${formatMoney(price)} ₽`;
    document.getElementById('fullNote').textContent = 'Полная онлайн-оплата без ожидания ссылки от менеджера.';
  }

  function setSelectedService(service) {
    state.selectedService = service;
    state.selectedSlot = null;
    selectedServiceSummary.textContent = `${service.name} - ${formatMoney(service.price)} ₽ / ${service.duration_minutes} мин`;
    selectedSlotSummary.textContent = 'Слот еще не выбран';
    clientStepSummary.textContent = 'Услуга и слот еще не выбраны';
    continueToClientButton.disabled = true;
    updatePaymentLabels();
    document.querySelectorAll('.service-card').forEach((card) => {
      card.classList.toggle('active', Number(card.dataset.serviceId) === service.id);
    });
  }

  function selectSlot(slot) {
    state.selectedSlot = slot;
    selectedSlotSummary.textContent = formatDateTime(slot.start_time);
    clientStepSummary.textContent = `${state.selectedService.name}, ${formatDateTime(slot.start_time)}`;
    continueToClientButton.disabled = false;
    renderSchedule();
  }

  function fillSuccess(mode) {
    document.getElementById('successService').textContent = state.selectedService?.name || '—';
    document.getElementById('successTime').textContent = state.selectedSlot ? formatDateTime(state.selectedSlot.start_time) : '—';
    document.getElementById('successMode').textContent =
      mode === 'partial' ? 'Частичная оплата 50%' :
      mode === 'full' ? 'Полная оплата' :
      'Только заявка';
  }

  function renderServices() {
    if (!services.length) {
      servicesGrid.innerHTML = '<div class="summary-card">Активные услуги пока не опубликованы.</div>';
      queueWidgetResize();
      return;
    }

    servicesGrid.innerHTML = '';
    services.forEach((service) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'service-card';
      button.dataset.serviceId = service.id;
      button.innerHTML = `
        <div class="service-name">${service.name}</div>
        <div class="service-meta">${formatMoney(service.price)} ₽ / ${service.duration_minutes} мин</div>
      `;
      button.addEventListener('click', async () => {
        setSelectedService(service);
        await loadAvailability();
        setStep(2);
      });
      servicesGrid.appendChild(button);
    });
    queueWidgetResize();
  }

  async function loadAvailability() {
    if (!state.selectedService) return;

    const query = new URLSearchParams({ service_id: String(state.selectedService.id) });
    if (state.weekStart) query.set('week_start', state.weekStart);

    scheduleGrid.innerHTML = '<div class="summary-card">Загружаем актуальное расписание...</div>';
    const response = await fetch(`${availabilityUrl}?${query.toString()}`);
    const payload = await parseResponseBody(response);

    if (!response.ok) {
      scheduleGrid.innerHTML = `<div class="summary-card">${formatResponseMessage(payload, 'Не удалось загрузить свободные слоты.')}</div>`;
      queueWidgetResize();
      return;
    }

    state.availability = payload;
    state.weekStart = payload.week_start;
    renderSchedule();
  }

  function renderSchedule() {
    if (!state.availability) {
      scheduleGrid.innerHTML = '<div class="summary-card">Нет данных по расписанию.</div>';
      queueWidgetResize();
      return;
    }

    weekLabel.textContent = formatWeekLabel(state.availability.week_start);

    const head = document.createElement('div');
    head.className = 'schedule-head';
    head.innerHTML = '<div class="time-cell">Время</div>';
    state.availability.days.forEach((day) => {
      const cell = document.createElement('div');
      cell.className = 'day-cell';
      cell.innerHTML = `<div class="day-title">${formatDayName(day.date)}</div><div class="day-date">${formatDayDate(day.date)}</div>`;
      head.appendChild(cell);
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
          if (state.selectedSlot?.start_time === cell.start_time) button.classList.add('selected');
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
    queueWidgetResize();
  }

  function redirectToPayment(url) {
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = url;
        return;
      }
    } catch (_error) {
      /* noop */
    }
    window.location.href = url;
  }

  document.getElementById('paymentOptions').addEventListener('change', (event) => {
    if (event.target.name !== 'paymentMode') return;
    document.querySelectorAll('.payment-option').forEach((node) => {
      node.classList.toggle('active', node.dataset.mode === event.target.value);
    });
  });

  document.getElementById('prevWeekButton').addEventListener('click', async () => {
    if (!state.weekStart) return;
    const date = new Date(state.weekStart);
    date.setDate(date.getDate() - 7);
    state.weekStart = date.toISOString().slice(0, 10);
    state.selectedSlot = null;
    continueToClientButton.disabled = true;
    selectedSlotSummary.textContent = 'Слот еще не выбран';
    await loadAvailability();
  });

  document.getElementById('nextWeekButton').addEventListener('click', async () => {
    if (!state.weekStart) return;
    const date = new Date(state.weekStart);
    date.setDate(date.getDate() + 7);
    state.weekStart = date.toISOString().slice(0, 10);
    state.selectedSlot = null;
    continueToClientButton.disabled = true;
    selectedSlotSummary.textContent = 'Слот еще не выбран';
    await loadAvailability();
  });

  document.getElementById('backToServicesButton').addEventListener('click', () => setStep(1));
  document.getElementById('continueToClientButton').addEventListener('click', () => {
    if (!state.selectedSlot) return;
    setStep(3);
  });
  document.getElementById('backToScheduleButton').addEventListener('click', () => setStep(2));

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
    clearErrors();

    clientNameInput.value = normalizeName(clientNameInput.value);
    clientPhoneInput.value = formatPhone(clientPhoneInput.value);

    const nameError = validateName(clientNameInput.value);
    const phoneError = validatePhone(clientPhoneInput.value);
    if (nameError || phoneError) {
      nameErrorNode.textContent = nameError;
      phoneErrorNode.textContent = phoneError;
      return;
    }

    if (!state.selectedService || !state.selectedSlot) {
      showError('Сначала выберите услугу и свободный слот.');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Отправляем...';

    const paymentMode = getPaymentMode();
    const payload = {
      service_id: state.selectedService.id,
      start_time: state.selectedSlot.start_time,
      client_name: clientNameInput.value,
      client_phone: normalizePhone(clientPhoneInput.value),
      client_email: clientEmailInput.value.trim(),
      notes: document.getElementById('notes').value,
    };

    try {
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const createPayload = await parseResponseBody(createResponse);

      if (!createResponse.ok) {
        if (createPayload?.client_name) nameErrorNode.textContent = Array.isArray(createPayload.client_name) ? createPayload.client_name.join(', ') : createPayload.client_name;
        if (createPayload?.client_phone) phoneErrorNode.textContent = Array.isArray(createPayload.client_phone) ? createPayload.client_phone.join(', ') : createPayload.client_phone;
        if (createPayload?.start_time) await loadAvailability();
        showError(formatResponseMessage(createPayload, `Не удалось оформить запись (HTTP ${createResponse.status}).`));
        return;
      }

      fillSuccess(paymentMode);

      if (paymentMode === 'request') {
        setStep(4);
        event.target.reset();
        return;
      }

      const bookingId = createPayload.booking?.id || createPayload.id;
      const bookingToken = createPayload.booking_token || createPayload.token;
      const paymentType = paymentMode === 'partial' ? 'partial' : 'full';

      const paymentResponse = await fetch(paymentCreateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking: bookingId,
          token: bookingToken,
          payment_type: paymentType,
        }),
      });
      const paymentPayload = await parseResponseBody(paymentResponse);

      if (!paymentResponse.ok) {
        showError(formatResponseMessage(paymentPayload, `Не удалось создать ссылку на оплату (HTTP ${paymentResponse.status}).`));
        return;
      }

      setStep(4);
      if (paymentPayload?.payment_url) {
        setTimeout(() => redirectToPayment(paymentPayload.payment_url), 300);
      } else {
        showError('Платеж создан, но ссылка на оплату не получена.');
      }
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Оформить';
    }
  });

  renderServices();
  queueWidgetResize();
</script>
</body>
</html>"""


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
        if self.request.user.is_authenticated and self.request.user.has_capability('bookings.manage'):
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
        if self.request.user.has_capability('bookings.manage'):
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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        notify_managers_about_booking(booking)

        payment_options = calculate_booking_payment_options(booking)
        return Response(
            {
                'booking': {
                    'id': booking.id,
                    'status': booking.status,
                    'service_name': booking.service.name,
                    'start_time': booking.start_time,
                    'contact_name': booking.contact_name,
                },
                'booking_token': build_booking_token(booking.id),
                'payment_options': payment_options,
            },
            status=status.HTTP_201_CREATED,
        )


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
            list(Service.objects.filter(is_active=True).values('id', 'name', 'description', 'duration_minutes', 'price')),
            ensure_ascii=False,
            cls=DjangoJSONEncoder,
        )
        html = render_booking_widget_html(services)
        html = (
            html.replace('__SERVICES__', services)
            .replace('__AVAILABILITY_URL__', '/api/booking/public-availability/')
            .replace('__CREATE_URL__', '/api/booking/public/')
            .replace('__PAYMENT_CREATE_URL__', '/api/payments/public/')
        )
        return HttpResponse(html)
