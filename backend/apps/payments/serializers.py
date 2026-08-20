from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone
from rest_framework import serializers

from apps.booking.models import Booking
from apps.users.models import User

from .models import Payment, PaymentPlan, PaymentSettings, PlannedPayment
from .planning import sync_plan_occurrences
from .tokens import build_payment_token


def quantize_amount(value):
    return Decimal(value).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def calculate_booking_payment_options(booking):
    service_price = quantize_amount(booking.service.price or 0)
    paid_amount = quantize_amount(booking.paid_amount or 0)
    remaining_amount = max(service_price - paid_amount, Decimal('0.00'))
    partial_target = quantize_amount(service_price * Decimal('0.50'))
    partial_amount = max(partial_target - paid_amount, Decimal('0.00'))
    partial_amount = min(partial_amount, remaining_amount)

    return {
        'service_price': service_price,
        'paid_amount': paid_amount,
        'remaining_amount': remaining_amount,
        'partial_amount': partial_amount,
        'full_amount': remaining_amount,
        'partial_available': partial_amount > 0,
        'full_available': remaining_amount > 0,
    }


class PaymentSerializer(serializers.ModelSerializer):
    booking_info = serializers.SerializerMethodField()
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    public_token = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id',
            'booking',
            'booking_info',
            'provider',
            'payment_type',
            'payment_type_display',
            'amount',
            'status',
            'transaction_id',
            'payment_url',
            'bank_order_id',
            'email_sent_at',
            'public_token',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_booking_info(self, obj):
        amounts = calculate_booking_payment_options(obj.booking)
        return {
            'id': obj.booking.id,
            'client': obj.booking.contact_name,
            'client_email': obj.booking.client.email if obj.booking.client else '',
            'phone': obj.booking.contact_phone,
            'service': obj.booking.service.name if obj.booking.service else '',
            'service_price': amounts['service_price'],
            'paid_amount': amounts['paid_amount'],
            'remaining_amount': amounts['remaining_amount'],
        }

    def get_public_token(self, obj):
        return build_payment_token(obj.id)


class PaymentCreateSerializer(serializers.Serializer):
    booking = serializers.PrimaryKeyRelatedField(queryset=Booking.objects.select_related('service', 'client'))
    payment_type = serializers.ChoiceField(choices=Payment.TYPE_CHOICES)
    send_email = serializers.BooleanField(default=False, required=False)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        amounts = calculate_booking_payment_options(attrs['booking'])
        payment_type = attrs['payment_type']

        if amounts['remaining_amount'] <= 0:
            raise serializers.ValidationError({'booking': 'Эта запись уже оплачена полностью.'})

        if payment_type == Payment.TYPE_PARTIAL and amounts['partial_amount'] <= 0:
            raise serializers.ValidationError({'payment_type': 'Для частичной оплаты 50% уже внесено достаточно средств.'})

        if attrs.get('send_email') and (not attrs['booking'].client or not attrs['booking'].client.email):
            raise serializers.ValidationError({'send_email': 'У клиента должен быть указан email для отправки ссылки.'})

        attrs['calculated_amounts'] = amounts
        return attrs


class PublicPaymentCreateSerializer(serializers.Serializer):
    booking = serializers.IntegerField(min_value=1)
    token = serializers.CharField()
    payment_type = serializers.ChoiceField(choices=Payment.TYPE_CHOICES)


class PaymentSettingsSerializer(serializers.ModelSerializer):
    shop_id = serializers.CharField(source='username', required=False, allow_blank=True)
    secret_key = serializers.CharField(source='password', required=False, allow_blank=True, write_only=True)

    class Meta:
        model = PaymentSettings
        fields = ['test_mode', 'shop_id', 'secret_key', 'base_url']


class PaymentPlanSerializer(serializers.ModelSerializer):
    responsible_ids = serializers.PrimaryKeyRelatedField(
        source='responsible',
        queryset=User.objects.all(),
        many=True,
        required=False,
        write_only=True,
    )
    responsible = serializers.SerializerMethodField(read_only=True)
    created_by = serializers.SerializerMethodField(read_only=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)

    class Meta:
        model = PaymentPlan
        fields = [
            'id',
            'title',
            'counterparty',
            'purpose',
            'amount',
            'start_date',
            'frequency',
            'frequency_display',
            'end_date',
            'reminder_days',
            'memo_recipient',
            'responsible',
            'responsible_ids',
            'created_by',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def validate(self, attrs):
        attrs = super().validate(attrs)
        start_date = attrs.get('start_date') or getattr(self.instance, 'start_date', None)
        end_date = attrs.get('end_date') if 'end_date' in attrs else getattr(self.instance, 'end_date', None)
        reminder_days = attrs.get('reminder_days', getattr(self.instance, 'reminder_days', 3))
        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError({'end_date': 'Дата окончания не может быть раньше первого платежа.'})
        if reminder_days > 90:
            raise serializers.ValidationError({'reminder_days': 'Напоминание можно установить максимум за 90 дней.'})
        return attrs

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Сумма должна быть больше нуля.')
        return value

    def get_responsible(self, obj):
        return [
            {'id': user.id, 'name': user.get_full_name(), 'position': user.position}
            for user in obj.responsible.all()
        ]

    def get_created_by(self, obj):
        if not obj.created_by:
            return None
        return {
            'id': obj.created_by.id,
            'name': obj.created_by.get_full_name(),
            'short_name': obj.created_by.get_short_name(),
            'position': obj.created_by.position,
        }

    def create(self, validated_data):
        plan = super().create(validated_data)
        if plan.is_active:
            sync_plan_occurrences(plan)
        return plan

    def update(self, instance, validated_data):
        plan = super().update(instance, validated_data)
        plan.occurrences.filter(status=PlannedPayment.STATUS_SCHEDULED).delete()
        if plan.is_active:
            sync_plan_occurrences(plan)
        return plan


class PlannedPaymentSerializer(serializers.ModelSerializer):
    plan = PaymentPlanSerializer(read_only=True)
    effective_status = serializers.SerializerMethodField()

    class Meta:
        model = PlannedPayment
        fields = [
            'id',
            'plan',
            'due_date',
            'amount',
            'status',
            'effective_status',
            'paid_at',
            'reminder_sent_at',
            'created_at',
        ]
        read_only_fields = fields

    def get_effective_status(self, obj):
        if obj.status == PlannedPayment.STATUS_SCHEDULED and obj.due_date < timezone.localdate():
            return 'overdue'
        return obj.status
