import json

from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions
from rest_framework.filters import SearchFilter
from rest_framework.views import APIView

from apps.notifications.services import create_in_app_notification
from apps.users.models import User
from apps.users.permissions import IsManagerOrHigher
from .models import Booking, Service
from .serializers import BookingSerializer, PublicBookingSerializer, ServiceSerializer


def notify_managers_about_booking(booking):
    managers = User.objects.filter(is_manager=True)
    for manager in managers:
        create_in_app_notification(
            user=manager,
            title='Новая запись',
            message=f'Клиент {booking.client.name} записан на {booking.service.name} ({booking.start_time})',
            link='/bookings',
        )


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
            return Booking.objects.all()
        return Booking.objects.none()

    def perform_create(self, serializer):
        booking = serializer.save()
        notify_managers_about_booking(booking)
        return booking


class BookingDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Booking.objects.all()
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


@method_decorator(xframe_options_exempt, name='dispatch')
class BookingWidgetView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        services = json.dumps(
            list(Service.objects.filter(is_active=True).values('id', 'name', 'duration_minutes', 'price')),
            ensure_ascii=False,
            cls=DjangoJSONEncoder,
        )
        html = f'''<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Записаться в студию</title>
<style>
  :root {{
    --bg: #f3f6fb;
    --panel: #ffffff;
    --line: #d7deea;
    --text: #0e1730;
    --muted: #5d677b;
    --primary: #1d6fff;
    --primary-dark: #1657cd;
    --success-bg: #eafbf0;
    --success-text: #176a43;
    --error-bg: #fff1f1;
    --error-text: #aa2d2d;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0;
    color: var(--text);
    font-family: Inter, "Segoe UI", Arial, sans-serif;
    background:
      linear-gradient(180deg, rgba(29,111,255,0.06), transparent 240px),
      var(--bg);
  }}
  .widget {{
    max-width: 1160px;
    margin: 0 auto;
    padding: 28px 28px 36px;
  }}
  .hero {{
    margin-bottom: 22px;
  }}
  .hero h1 {{
    margin: 0;
    font-size: clamp(38px, 5vw, 72px);
    line-height: 0.92;
    text-transform: uppercase;
    letter-spacing: -0.06em;
    font-weight: 900;
  }}
  .hero-bar {{
    width: min(86%, 900px);
    height: 22px;
    margin-top: 8px;
    background: var(--primary);
  }}
  .layout {{
    display: grid;
    gap: 18px;
  }}
  .top-grid {{
    display: grid;
    gap: 18px;
    grid-template-columns: 1.15fr 0.85fr;
  }}
  .section {{
    border: 1px solid var(--line);
    background: var(--panel);
    padding: 20px;
  }}
  .section-header {{
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }}
  .step {{
    display: inline-flex;
    width: 38px;
    height: 38px;
    align-items: center;
    justify-content: center;
    background: var(--primary);
    color: white;
    font-size: 15px;
    font-weight: 900;
  }}
  .section-title {{
    margin: 0;
    font-size: 20px;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: -0.04em;
    font-weight: 900;
  }}
  .services-grid {{
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }}
  .service-card {{
    border: 1px solid var(--line);
    background: #fff;
    padding: 14px;
    cursor: pointer;
    transition: 180ms ease;
    text-align: left;
  }}
  .service-card:hover {{
    border-color: var(--primary);
    box-shadow: 0 16px 32px rgba(29, 111, 255, 0.08);
  }}
  .service-card.active {{
    background: var(--primary);
    border-color: var(--primary);
    color: white;
  }}
  .service-name {{
    font-size: 16px;
    font-weight: 900;
    letter-spacing: -0.02em;
  }}
  .service-meta {{
    margin-top: 8px;
    font-size: 13px;
    color: var(--muted);
  }}
  .service-card.active .service-meta {{
    color: rgba(255,255,255,0.92);
  }}
  .service-empty {{
    border: 1px dashed var(--line);
    padding: 18px;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.5;
    background: #fbfcff;
  }}
  .field-grid {{
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }}
  .field {{
    display: flex;
    flex-direction: column;
    gap: 6px;
  }}
  .field-wide {{
    grid-column: 1 / -1;
  }}
  label {{
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    font-weight: 700;
  }}
  input, textarea {{
    width: 100%;
    min-height: 56px;
    border: 1px solid var(--line);
    padding: 14px 16px;
    font-size: 16px;
    color: var(--text);
    background: #fff;
    outline: none;
    transition: 160ms ease;
  }}
  textarea {{
    min-height: 116px;
    resize: vertical;
  }}
  input:focus, textarea:focus {{
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(29,111,255,0.12);
  }}
  .date-note {{
    margin: 0 0 14px;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.5;
  }}
  .submit-row {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-top: 18px;
  }}
  .summary {{
    font-size: 14px;
    color: var(--muted);
  }}
  .submit {{
    min-width: 280px;
    min-height: 58px;
    border: 0;
    background: var(--primary);
    color: #fff;
    font-size: 16px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 900;
    cursor: pointer;
    transition: 160ms ease;
  }}
  .submit:hover {{
    background: var(--primary-dark);
  }}
  .message {{
    display: none;
    margin-top: 16px;
    padding: 14px 16px;
    font-size: 14px;
  }}
  .message.success {{
    display: block;
    background: var(--success-bg);
    color: var(--success-text);
  }}
  .message.error {{
    display: block;
    background: var(--error-bg);
    color: var(--error-text);
  }}
  @media (max-width: 920px) {{
    .widget {{
      padding: 18px;
    }}
    .hero-bar {{
      width: 78%;
      height: 16px;
    }}
    .top-grid, .field-grid, .services-grid {{
      grid-template-columns: 1fr;
    }}
    .submit-row {{
      flex-direction: column;
      align-items: stretch;
    }}
    .submit {{
      min-width: 0;
      width: 100%;
    }}
  }}
</style>
</head>
<body>
<div class="widget">
  <div class="hero">
    <h1>Записаться в студию</h1>
    <div class="hero-bar"></div>
  </div>

  <form id="bookingForm">
    <input type="hidden" name="service_id" id="serviceInput" required>

    <div class="layout">
      <div class="top-grid">
        <section class="section">
          <div class="section-header">
            <div class="step">01</div>
            <h2 class="section-title">Выберите услугу</h2>
          </div>
          <div class="services-grid" id="servicesGrid"></div>
        </section>

        <section class="section">
          <div class="section-header">
            <div class="step">02</div>
            <h2 class="section-title">Дата</h2>
          </div>
          <p class="date-note">Укажите удобные дату и время. Мы быстро подтвердим запись или предложим ближайший свободный слот.</p>
          <div class="field">
            <label for="startTime">Дата и время записи</label>
            <input id="startTime" type="datetime-local" name="start_time" required>
          </div>
        </section>
      </div>

      <section class="section">
        <div class="section-header">
          <div class="step">03</div>
          <h2 class="section-title">Данные клиента</h2>
        </div>
        <div class="field-grid">
          <div class="field">
            <label for="clientName">Имя</label>
            <input id="clientName" type="text" name="client_name" placeholder="Ваше имя" required>
          </div>
          <div class="field">
            <label for="clientPhone">Телефон</label>
            <input id="clientPhone" type="tel" name="client_phone" placeholder="+7 (999) 000-00-00" required>
          </div>
          <div class="field field-wide">
            <label for="notes">Примечание</label>
            <textarea id="notes" name="notes" placeholder="Формат съёмки, количество гостей, дополнительные пожелания"></textarea>
          </div>
        </div>
        <div class="submit-row">
          <div class="summary" id="summaryText">Выберите услугу и укажите удобное время.</div>
          <button class="submit" type="submit">Отправить заявку</button>
        </div>
      </section>
    </div>
  </form>

  <div id="message" class="message"></div>
</div>

<script>
  const services = {services};
  const servicesGrid = document.getElementById('servicesGrid');
  const serviceInput = document.getElementById('serviceInput');
  const summaryText = document.getElementById('summaryText');
  const messageNode = document.getElementById('message');

  const formatPrice = (value) => Number(value || 0).toLocaleString('ru-RU');

  function setActiveService(service) {{
    serviceInput.value = service.id;
    summaryText.textContent = `Выбрано: ${{service.name}} · ${{formatPrice(service.price)}} ₽`;
    document.querySelectorAll('.service-card').forEach(card => {{
      card.classList.toggle('active', card.dataset.serviceId === String(service.id));
    }});
  }}

  if (!services.length) {{
    servicesGrid.innerHTML = '<div class="service-empty">Активные услуги пока не добавлены в CRM. Проверьте, что у нужной услуги включён флаг активности.</div>';
  }} else {{
  services.forEach((service, index) => {{
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'service-card';
    card.dataset.serviceId = service.id;
    card.innerHTML = `
      <div class="service-name">${{service.name}}</div>
      <div class="service-meta">${{formatPrice(service.price)}} ₽${{service.duration_minutes ? ` / ${{service.duration_minutes}} мин.` : ''}}</div>
    `;
    card.addEventListener('click', () => setActiveService(service));
    servicesGrid.appendChild(card);
    if (index === 0) setActiveService(service);
  }});
  }}

  document.getElementById('bookingForm').addEventListener('submit', async (e) => {{
    e.preventDefault();
    const body = {{}};
    new FormData(e.target).forEach((value, key) => {{
      body[key] = value;
    }});

    try {{
      const res = await fetch('/api/booking/public/', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify(body),
      }});
      const data = await res.json();
      messageNode.className = `message ${{res.ok ? 'success' : 'error'}}`;
      messageNode.textContent = res.ok
        ? 'Заявка отправлена. Мы подтвердим запись и свяжемся с вами.'
        : JSON.stringify(data);

      if (res.ok) {{
        e.target.reset();
        if (services[0]) setActiveService(services[0]);
        summaryText.textContent = 'Заявка отправлена. Проверьте телефон: менеджер свяжется с вами для подтверждения.';
      }}
    }} catch (error) {{
      messageNode.className = 'message error';
      messageNode.textContent = error.message;
    }}
  }});
</script>
</body>
</html>'''
        return HttpResponse(html)
