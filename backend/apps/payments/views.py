import logging
import uuid
from decimal import Decimal

from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Sum
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.booking.models import Booking
from apps.notifications.services import create_in_app_notification
from apps.users.models import User
from apps.users.permissions import IsAdminOrDirector, IsManagerOrHigher

from .models import Payment, PaymentSettings
from .serializers import (
    PaymentCreateSerializer,
    PaymentSerializer,
    PaymentSettingsSerializer,
    PublicPaymentCreateSerializer,
    calculate_booking_payment_options,
)
from .tokens import build_payment_token, read_booking_token, read_payment_token
from .yookassa import create_payment, get_payment

logger = logging.getLogger(__name__)


def notify_managers_about_payment(payment, status_label):
    managers = User.objects.filter(is_manager=True)
    for manager in managers:
        create_in_app_notification(
            user=manager,
            title=f'Платеж {status_label}',
            message=f'Платеж #{payment.id} на {payment.amount} ₽ - {status_label}',
            link='/payments',
        )


def map_gateway_status(status_name):
    if status_name == 'succeeded':
        return Payment.STATUS_SUCCESS
    if status_name == 'canceled':
        return Payment.STATUS_CANCELED
    if status_name in ['pending', 'waiting_for_capture']:
        return Payment.STATUS_PENDING
    return Payment.STATUS_FAILED


def sync_booking_paid_amount(booking):
    total_paid = booking.payments.filter(status=Payment.STATUS_SUCCESS).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    if booking.paid_amount != total_paid:
        booking.paid_amount = total_paid
        booking.save(update_fields=['paid_amount'])


def refresh_payment_status(payment):
    if not payment.transaction_id:
        return payment, False

    result = get_payment(payment.transaction_id)
    if not result.get('success'):
        return payment, False

    next_status = map_gateway_status(result.get('status'))
    changed = next_status != payment.status

    if changed:
        payment.status = next_status
        payment.save(update_fields=['status', 'updated_at'])

        if payment.status == Payment.STATUS_SUCCESS:
            sync_booking_paid_amount(payment.booking)
            notify_managers_about_payment(payment, 'успешен')
        elif payment.status in [Payment.STATUS_FAILED, Payment.STATUS_CANCELED]:
            notify_managers_about_payment(payment, 'отклонен')

    return payment, changed


def get_payment_amount(booking, payment_type):
    amounts = calculate_booking_payment_options(booking)

    if amounts['remaining_amount'] <= 0:
        raise ValidationError({'booking': 'Эта запись уже оплачена полностью.'})

    if payment_type == Payment.TYPE_PARTIAL:
        if amounts['partial_amount'] <= 0:
            raise ValidationError({'payment_type': 'Для частичной оплаты 50% уже внесено достаточно средств.'})
        return amounts['partial_amount']

    return amounts['full_amount']


def send_payment_link_email(payment):
    booking = payment.booking
    client = booking.client
    if not client or not client.email:
        raise ValidationError({'detail': 'У клиента не указан email для отправки ссылки.'})
    if not payment.payment_url:
        raise ValidationError({'detail': 'Ссылка на оплату еще не создана.'})

    subject = f'Ссылка на оплату услуги "{booking.service.name}"'
    body = (
        f'Здравствуйте, {booking.contact_name}!\n\n'
        f'Для записи "{booking.service.name}" подготовлена ссылка на оплату.\n'
        f'Тип оплаты: {payment.get_payment_type_display()}.\n'
        f'Сумма: {payment.amount} ₽.\n\n'
        f'Оплатить: {payment.payment_url}\n\n'
        f'Если у вас возникнут вопросы, свяжитесь с нами.'
    )

    send_mail(
        subject=subject,
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[client.email],
        fail_silently=False,
    )
    payment.email_sent_at = timezone.now()
    payment.save(update_fields=['email_sent_at'])


def create_payment_for_booking(request, booking, payment_type, *, send_email=False):
    amount = get_payment_amount(booking, payment_type)
    payment = Payment.objects.create(
        booking=booking,
        provider=Payment.PROVIDER_YOOKASSA,
        payment_type=payment_type,
        amount=amount,
        status=Payment.STATUS_PENDING,
    )

    public_token = build_payment_token(payment.id)
    idempotence_key = f'booking-{booking.id}-payment-{payment.id}-{uuid.uuid4().hex[:12]}'
    return_url = request.build_absolute_uri(f'/payment/success/?payment={payment.id}&token={public_token}')

    result = create_payment(
        amount=amount,
        return_url=return_url,
        description=f'Оплата записи #{booking.id}: {booking.service.name}',
        metadata={
            'payment_id': str(payment.id),
            'booking_id': str(booking.id),
            'payment_type': payment_type,
        },
        idempotence_key=idempotence_key,
    )

    if not result.get('success'):
        payment.status = Payment.STATUS_FAILED
        payment.bank_order_id = idempotence_key
        payment.save(update_fields=['status', 'bank_order_id', 'updated_at'])
        raise ValidationError({'detail': result.get('error') or 'Не удалось создать ссылку на оплату.'})

    payment.transaction_id = result.get('payment_id') or ''
    payment.payment_url = result.get('confirmation_url') or ''
    payment.bank_order_id = result.get('idempotence_key') or idempotence_key
    payment.status = map_gateway_status(result.get('status'))
    payment.save(update_fields=['transaction_id', 'payment_url', 'bank_order_id', 'status', 'updated_at'])

    if payment.status == Payment.STATUS_SUCCESS:
        sync_booking_paid_amount(payment.booking)
        notify_managers_about_payment(payment, 'успешен')

    if send_email:
        send_payment_link_email(payment)

    return payment


class PaymentListCreateView(generics.ListCreateAPIView):
    serializer_class = PaymentSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsManagerOrHigher()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        booking_id = self.request.query_params.get('booking')
        queryset = Payment.objects.select_related('booking__client', 'booking__service').all()
        if booking_id:
            queryset = queryset.filter(booking_id=booking_id)
        if not self.request.user.is_manager:
            queryset = queryset.filter(booking__client__telegram=self.request.user.telegram_id)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = PaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = create_payment_for_booking(
            request,
            serializer.validated_data['booking'],
            serializer.validated_data['payment_type'],
            send_email=serializer.validated_data.get('send_email', False),
        )
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class PublicPaymentCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PublicPaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            payload = read_booking_token(serializer.validated_data['token'])
        except Exception as error:
            raise ValidationError({'token': 'Ссылка на оплату устарела. Оформите запись заново.'}) from error

        booking = get_object_or_404(
            Booking.objects.select_related('service', 'client'),
            pk=serializer.validated_data['booking'],
        )
        if payload.get('booking_id') != booking.id:
            raise ValidationError({'token': 'Некорректный токен оплаты.'})

        payment = create_payment_for_booking(request, booking, serializer.validated_data['payment_type'])
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class PaymentDetailView(generics.RetrieveAPIView):
    queryset = Payment.objects.select_related('booking__client', 'booking__service').all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]


class PaymentCallbackView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payment_object = request.data.get('object') or {}
        payment_id = payment_object.get('id') or request.data.get('orderId')
        if not payment_id:
            return Response({'ok': True})

        payment = (
            Payment.objects.filter(transaction_id=payment_id).select_related('booking').first()
            or Payment.objects.filter(bank_order_id=payment_id).select_related('booking').first()
        )
        if not payment:
            logger.warning('Payment callback for unknown external id: %s', payment_id)
            return Response({'ok': True})

        refresh_payment_status(payment)
        return Response({'status': payment.status})


class PaymentStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        payment = get_object_or_404(Payment.objects.select_related('booking__client', 'booking__service'), pk=pk)
        refresh_payment_status(payment)
        return Response(PaymentSerializer(payment).data)


class PublicPaymentStatusView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        payment_id = request.query_params.get('payment')
        token = request.query_params.get('token')
        if not payment_id or not token:
            return Response({'detail': 'payment and token required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = read_payment_token(token)
        except Exception:
            return Response({'detail': 'Invalid payment token'}, status=status.HTTP_400_BAD_REQUEST)

        if str(payload.get('payment_id')) != str(payment_id):
            return Response({'detail': 'Invalid payment token'}, status=status.HTTP_400_BAD_REQUEST)

        payment = get_object_or_404(Payment.objects.select_related('booking__client', 'booking__service'), pk=payment_id)
        refresh_payment_status(payment)
        return Response(PaymentSerializer(payment).data)


class PaymentByOrderView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        order_id = request.query_params.get('orderId')
        if not order_id:
            return Response({'detail': 'orderId required'}, status=status.HTTP_400_BAD_REQUEST)

        payment = (
            Payment.objects.filter(bank_order_id=order_id).select_related('booking__client', 'booking__service').first()
            or Payment.objects.filter(transaction_id=order_id).select_related('booking__client', 'booking__service').first()
        )
        if not payment:
            return Response({'detail': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)

        refresh_payment_status(payment)
        return Response(PaymentSerializer(payment).data)


class PaymentSendLinkView(APIView):
    permission_classes = [IsManagerOrHigher]

    def post(self, request, pk):
        payment = get_object_or_404(Payment.objects.select_related('booking__client', 'booking__service'), pk=pk)
        send_payment_link_email(payment)
        return Response({
            'sent': True,
            'email': payment.booking.client.email if payment.booking.client else '',
            'email_sent_at': payment.email_sent_at,
        })


class PaymentReceiptView(APIView):
    permission_classes = [IsManagerOrHigher]

    def get(self, request, pk):
        payment = get_object_or_404(Payment.objects.select_related('booking__client', 'booking__service'), pk=pk)
        booking = payment.booking
        html = f"""<!DOCTYPE html>
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
    <tr><td>Клиент</td><td>{booking.contact_name}</td></tr>
    <tr><td>Услуга</td><td>{booking.service.name}</td></tr>
    <tr><td>Тип оплаты</td><td>{payment.get_payment_type_display()}</td></tr>
    <tr><td>Сумма</td><td>{payment.amount} ₽</td></tr>
    <tr><td>Статус</td><td>{payment.get_status_display()}</td></tr>
    <tr><td>YooKassa ID</td><td>{payment.transaction_id or '-'}</td></tr>
  </table>
  <p class="total">Итого: {payment.amount} ₽</p>
</body>
</html>"""
        return HttpResponse(html, content_type='text/html')


class PaymentSettingsView(APIView):
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        settings_obj = PaymentSettings.get_settings()
        return Response(PaymentSettingsSerializer(settings_obj).data)

    def put(self, request):
        settings_obj = PaymentSettings.get_settings()
        serializer = PaymentSettingsSerializer(settings_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
