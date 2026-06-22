from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.http import HttpResponse
from .models import Service, Booking
from .serializers import ServiceSerializer, BookingSerializer, PublicBookingSerializer
from apps.users.permissions import IsManagerOrHigher
from apps.notifications.services import create_in_app_notification
from apps.users.models import User


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


class BookingWidgetView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        services = Service.objects.filter(is_active=True).values('id', 'name', 'duration_minutes', 'price')
        services_json = list(services)
        html = f'''<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Запись на услугу</title>
<style>
  body {{ font-family: sans-serif; margin: 0; padding: 16px; background: #f9fafb; }}
  .widget {{ max-width: 360px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
  .widget h3 {{ margin-top: 0; }}
  .widget label {{ display: block; margin: 10px 0 4px; font-size: 14px; }}
  .widget input, .widget select {{ width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #d1d5db; border-radius: 4px; }}
  .widget button {{ width: 100%; margin-top: 15px; padding: 10px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; }}
  .widget .success {{ color: #065f46; margin-top: 10px; }}
  .widget .error {{ color: #b91c1c; margin-top: 10px; }}
</style>
</head>
<body>
<div class="widget">
  <h3>Запись на услугу</h3>
  <form id="bookingForm">
    <label>Имя</label>
    <input type="text" name="client_name" required>
    <label>Телефон</label>
    <input type="tel" name="client_phone" required>
    <label>Услуга</label>
    <select name="service_id" id="serviceSelect" required></select>
    <label>Дата и время</label>
    <input type="datetime-local" name="start_time" required>
    <label>Примечания</label>
    <input type="text" name="notes">
    <button type="submit">Записаться</button>
  </form>
  <div id="message"></div>
</div>
<script>
  const services = {services_json};
  const select = document.getElementById('serviceSelect');
  services.forEach(s => {{ select.innerHTML += `<option value="${{s.id}}">${{s.name}}</option>`; }});
  const apiUrl = '/api/booking/public/';
  document.getElementById('bookingForm').addEventListener('submit', async (e) => {{
    e.preventDefault();
    const form = e.target;
    const body = {{}};
    new FormData(form).forEach((v, k) => body[k] = v);
    try {{
      const res = await fetch(apiUrl, {{ method: 'POST', headers: {{'Content-Type':'application/json'}}, body: JSON.stringify(body) }});
      const data = await res.json();
      document.getElementById('message').className = res.ok ? 'success' : 'error';
      document.getElementById('message').textContent = res.ok ? 'Запись принята! Мы свяжемся с вами.' : JSON.stringify(data);
      if (res.ok) form.reset();
    }} catch (err) {{
      document.getElementById('message').className = 'error';
      document.getElementById('message').textContent = err.message;
    }}
  }});
</script>
</body>
</html>'''
        return HttpResponse(html)
