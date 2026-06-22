import uuid
import logging
from decimal import Decimal
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Sum
from django.http import HttpResponse
from apps.booking.models import Booking
from apps.users.permissions import IsManagerOrHigher, IsAdminOrDirector
from .models import Payment, PaymentSettings
from .serializers import PaymentSerializer, PaymentSettingsSerializer
from .alfabank import register_payment, check_order_status
from apps.notifications.services import create_in_app_notification
from apps.users.models import User


def notify_managers_about_payment(payment, status_label):
    managers = User.objects.filter(is_manager=True)
    for manager in managers:
        create_in_app_notification(
            user=manager,
            title=f'Платёж {status_label}',
            message=f'Платёж #{payment.id} на {payment.amount} ₽ — {status_label}',
            link='/payments',
        )


class PaymentListCreateView(generics.ListCreateAPIView):
    serializer_class = PaymentSerializer

    def get_queryset(self):
        booking_id = self.request.query_params.get('booking')
        qs = Payment.objects.all()
        if booking_id:
            qs = qs.filter(booking_id=booking_id)
        if not self.request.user.is_manager:
            qs = qs.filter(booking__client__telegram=self.request.user.telegram_id)
        return qs

    def perform_create(self, serializer):
        payment = serializer.save(status=Payment.STATUS_PENDING)
        booking = payment.booking
        order_number = f'booking-{booking.id}-payment-{payment.id}-{uuid.uuid4().hex[:8]}'
        return_url = self.request.build_absolute_uri('/payment/success/')
        result = register_payment(
            amount=float(payment.amount),
            order_number=order_number,
            return_url=return_url,
            description=f'Оплата записи #{booking.id}'
        )
        if result.get('success'):
            payment.bank_order_id = result.get('orderId')
            payment.payment_url = result.get('formUrl')
            payment.save()
        else:
            payment.status = Payment.STATUS_FAILED
            payment.save()
        return payment

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED, headers=headers)


class PaymentDetailView(generics.RetrieveAPIView):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer


class PaymentCallbackView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        logger = logging.getLogger(__name__)
        order_id = request.data.get('orderId')
        logger.info(f'[Альфа-Банк callback] orderId={order_id} data={request.data}')
        if not order_id:
            return Response({'detail': 'orderId required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(bank_order_id=order_id)
        except Payment.DoesNotExist:
            logger.warning(f'[Альфа-Банк callback] Платёж не найден: {order_id}')
            return Response({'detail': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)

        result = check_order_status(order_id)
        logger.info(f'[Альфа-Банк callback] Статус заказа {order_id}: {result}')
        if result.get('success') and result.get('status') == 2:
            payment.status = Payment.STATUS_SUCCESS
        else:
            payment.status = Payment.STATUS_FAILED
        payment.save()

        # Обновляем сумму оплаты в записи
        total_paid = payment.booking.payments.filter(status=Payment.STATUS_SUCCESS).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        payment.booking.paid_amount = total_paid
        payment.booking.save()

        notify_managers_about_payment(payment, 'успешен' if payment.status == Payment.STATUS_SUCCESS else 'неуспешен')

        return Response({'status': payment.status})


class PaymentStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        payment = get_object_or_404(Payment, pk=pk)
        status_changed = False
        if payment.status == Payment.STATUS_PENDING and payment.bank_order_id:
            result = check_order_status(payment.bank_order_id)
            if result.get('success') and result.get('status') == 2:
                payment.status = Payment.STATUS_SUCCESS
                payment.save()
                total_paid = payment.booking.payments.filter(status=Payment.STATUS_SUCCESS).aggregate(total=Sum('amount'))['total'] or Decimal('0')
                payment.booking.paid_amount = total_paid
                payment.booking.save()
                status_changed = True
        if status_changed:
            notify_managers_about_payment(payment, 'успешен')
        return Response(PaymentSerializer(payment).data)


class PaymentByOrderView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        order_id = request.query_params.get('orderId')
        if not order_id:
            return Response({'detail': 'orderId required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            payment = Payment.objects.get(bank_order_id=order_id)
        except Payment.DoesNotExist:
            return Response({'detail': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)

        if payment.status == Payment.STATUS_PENDING and payment.bank_order_id:
            result = check_order_status(payment.bank_order_id)
            if result.get('success') and result.get('status') == 2:
                payment.status = Payment.STATUS_SUCCESS
                payment.save()
                total_paid = payment.booking.payments.filter(status=Payment.STATUS_SUCCESS).aggregate(total=Sum('amount'))['total'] or Decimal('0')
                payment.booking.paid_amount = total_paid
                payment.booking.save()
                notify_managers_about_payment(payment, 'успешен')

        return Response(PaymentSerializer(payment).data)


class PaymentReceiptView(APIView):
    permission_classes = [IsManagerOrHigher]

    def get(self, request, pk):
        payment = get_object_or_404(Payment, pk=pk)
        booking = payment.booking
        html = f'''<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Квитанция #{payment.id}</title>
<style>
  body {{ font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }}
  h1 {{ font-size: 24px; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
  td {{ padding: 8px; border-bottom: 1px solid #ddd; }}
  .total {{ font-weight: bold; font-size: 18px; }}
</style>
</head>
<body>
  <h1>Квитанция об оплате #{payment.id}</h1>
  <p>Дата: {payment.created_at.strftime('%d.%m.%Y %H:%M')}</p>
  <table>
    <tr><td>Клиент</td><td>{booking.client.name}</td></tr>
    <tr><td>Услуга</td><td>{booking.service.name}</td></tr>
    <tr><td>Сумма</td><td>{payment.amount} ₽</td></tr>
    <tr><td>Статус</td><td>{payment.get_status_display()}</td></tr>
    <tr><td>Номер заказа</td><td>{payment.bank_order_id or '—'}</td></tr>
  </table>
  <p class="total">Итого: {payment.amount} ₽</p>
</body>
</html>'''
        return HttpResponse(html, content_type='text/html')


class PaymentSettingsView(APIView):
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        settings = PaymentSettings.get_settings()
        return Response(PaymentSettingsSerializer(settings).data)

    def put(self, request):
        settings = PaymentSettings.get_settings()
        serializer = PaymentSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
