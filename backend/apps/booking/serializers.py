import re
from datetime import timedelta

from rest_framework import serializers

from apps.clients.models import Client
from apps.clients.serializers import ClientSerializer

from .models import Booking, Service

NAME_PATTERN = re.compile(r"^[A-Za-zА-Яа-яЁё]+(?:[ '-][A-Za-zА-Яа-яЁё]+)*$")
BLOCKING_STATUSES = [Booking.STATUS_PENDING, Booking.STATUS_CONFIRMED, Booking.STATUS_COMPLETED]
PUBLIC_BOOKING_DURATION_MINUTES = 60


def normalize_client_name(value):
    normalized = ' '.join(str(value or '').split())
    if len(normalized) < 2:
        raise serializers.ValidationError('Укажите имя не короче 2 символов.')
    if not NAME_PATTERN.fullmatch(normalized):
        raise serializers.ValidationError('Имя может содержать только буквы, пробел, дефис и апостроф.')
    return normalized


def normalize_phone_number(value):
    digits = re.sub(r'\D', '', str(value or ''))
    if not digits:
        raise serializers.ValidationError('Укажите телефон.')
    if digits[0] == '8':
        digits = '7' + digits[1:]
    elif digits[0] == '9':
        digits = '7' + digits
    elif digits[0] != '7':
        digits = '7' + digits
    if len(digits) != 11 or not digits.startswith('7'):
        raise serializers.ValidationError('Телефон должен быть в формате +7 999 999 99 99.')
    return f'+{digits}'


class BookingValidationMixin:
    def validate_client_name(self, value):
        return normalize_client_name(value)

    def validate_client_phone(self, value):
        return normalize_phone_number(value)

    def validate_requester_name(self, value):
        if value in (None, ''):
            return ''
        return normalize_client_name(value)

    def validate_requester_phone(self, value):
        if value in (None, ''):
            return ''
        return normalize_phone_number(value)

    def _set_end_time(self, validated_data, instance=None):
        service = validated_data.get('service') or getattr(instance, 'service', None)
        start_time = validated_data.get('start_time') or getattr(instance, 'start_time', None)
        if service and start_time:
            validated_data['end_time'] = start_time + timedelta(minutes=service.duration_minutes)

    def _validate_slot_conflict(self, validated_data, instance=None):
        service = validated_data.get('service') or getattr(instance, 'service', None)
        start_time = validated_data.get('start_time') or getattr(instance, 'start_time', None)
        end_time = validated_data.get('end_time') or getattr(instance, 'end_time', None)
        if not service or not start_time or not end_time:
            return

        queryset = Booking.objects.filter(
            status__in=BLOCKING_STATUSES,
            start_time__lt=end_time,
            end_time__gt=start_time,
        )
        if instance:
            queryset = queryset.exclude(pk=instance.pk)
        if queryset.exists():
            raise serializers.ValidationError({
                'start_time': 'Это время уже занято. Выберите другой слот.',
            })

    def _get_or_create_client(self, name, phone, email=''):
        if not name:
            raise serializers.ValidationError({'requester_name': 'Нужно указать имя клиента для подтверждения записи.'})

        normalized_name = normalize_client_name(name)
        normalized_phone = normalize_phone_number(phone) if phone else ''
        normalized_email = str(email or '').strip()
        queryset = Client.objects.all()
        client = None

        if normalized_phone:
            client = queryset.filter(phone=normalized_phone).first()
        if not client and normalized_email:
            client = queryset.filter(email__iexact=normalized_email).first()

        if client:
            updated_fields = []
            if normalized_name and client.name != normalized_name:
                client.name = normalized_name
                updated_fields.append('name')
            if normalized_phone and client.phone != normalized_phone:
                client.phone = normalized_phone
                updated_fields.append('phone')
            if normalized_email and client.email != normalized_email:
                client.email = normalized_email
                updated_fields.append('email')
            if updated_fields:
                client.save(update_fields=updated_fields)
            return client

        return Client.objects.create(
            name=normalized_name,
            phone=normalized_phone,
            email=normalized_email,
        )

    def _ensure_client_for_status(self, booking, validated_data):
        target_status = validated_data.get('status', booking.status)
        if target_status not in [Booking.STATUS_CONFIRMED, Booking.STATUS_COMPLETED]:
            return booking
        if booking.client_id:
            return booking

        client = self._get_or_create_client(booking.requester_name, booking.requester_phone)
        booking.client = client
        booking.save(update_fields=['client'])
        return booking

    def validate(self, attrs):
        attrs = super().validate(attrs)
        instance = getattr(self, 'instance', None)
        client = attrs.get('client') or getattr(instance, 'client', None)
        requester_name = attrs.get('requester_name')
        if requester_name is None and instance:
            requester_name = instance.requester_name

        if not client and not requester_name:
            raise serializers.ValidationError({
                'requester_name': 'Укажите имя клиента или выберите существующего клиента.',
            })
        return attrs


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'name', 'description', 'duration_minutes', 'price', 'is_active']


class BookingSerializer(BookingValidationMixin, serializers.ModelSerializer):
    client = ClientSerializer(read_only=True)
    client_id = serializers.PrimaryKeyRelatedField(source='client', queryset=Client.objects.all(), write_only=True, required=False, allow_null=True)
    service = ServiceSerializer(read_only=True)
    service_id = serializers.PrimaryKeyRelatedField(source='service', queryset=Service.objects.all(), write_only=True)
    requester_name = serializers.CharField(required=False, allow_blank=True)
    requester_phone = serializers.CharField(required=False, allow_blank=True)
    contact_name = serializers.SerializerMethodField(read_only=True)
    contact_phone = serializers.SerializerMethodField(read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    is_pending_request = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id',
            'client',
            'client_id',
            'requester_name',
            'requester_phone',
            'contact_name',
            'contact_phone',
            'is_pending_request',
            'service',
            'service_id',
            'start_time',
            'end_time',
            'status',
            'paid_amount',
            'remaining_amount',
            'notes',
            'created_at',
        ]
        read_only_fields = ['end_time', 'paid_amount', 'remaining_amount', 'created_at']

    def get_contact_name(self, obj):
        return obj.contact_name

    def get_contact_phone(self, obj):
        return obj.contact_phone

    def get_is_pending_request(self, obj):
        return obj.client_id is None and obj.status == Booking.STATUS_PENDING

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['remaining_amount'] = max(instance.service.price - instance.paid_amount, 0)
        return data

    def create(self, validated_data):
        self._set_end_time(validated_data)
        self._validate_slot_conflict(validated_data)

        if validated_data.get('client'):
            validated_data.setdefault('requester_name', validated_data['client'].name)
            validated_data.setdefault('requester_phone', validated_data['client'].phone)
        elif validated_data.get('status') in [Booking.STATUS_CONFIRMED, Booking.STATUS_COMPLETED]:
            validated_data['client'] = self._get_or_create_client(
                validated_data.get('requester_name', ''),
                validated_data.get('requester_phone', ''),
            )

        booking = super().create(validated_data)
        return self._ensure_client_for_status(booking, validated_data)

    def update(self, instance, validated_data):
        self._set_end_time(validated_data, instance=instance)
        self._validate_slot_conflict(validated_data, instance=instance)

        selected_client = validated_data.get('client')
        if selected_client:
            validated_data.setdefault('requester_name', selected_client.name)
            validated_data.setdefault('requester_phone', selected_client.phone)

        booking = super().update(instance, validated_data)
        return self._ensure_client_for_status(booking, validated_data)


class PublicBookingSerializer(BookingValidationMixin, serializers.ModelSerializer):
    client_name = serializers.CharField(source='requester_name', write_only=True)
    client_phone = serializers.CharField(source='requester_phone', write_only=True)
    client_email = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    service_id = serializers.PrimaryKeyRelatedField(source='service', queryset=Service.objects.filter(is_active=True), write_only=True)

    class Meta:
        model = Booking
        fields = ['id', 'client_name', 'client_phone', 'client_email', 'service_id', 'start_time', 'end_time', 'status', 'notes', 'created_at']
        read_only_fields = ['end_time', 'status', 'created_at']

    def validate(self, attrs):
        attrs = super().validate(attrs)
        start_time = attrs.get('start_time')
        if start_time and (start_time.minute != 0 or start_time.second != 0 or start_time.microsecond != 0):
            raise serializers.ValidationError({
                'start_time': 'Запись доступна только на полный час: 10:00, 11:00 и далее.',
            })
        attrs['status'] = Booking.STATUS_PENDING
        return attrs

    def create(self, validated_data):
        email = validated_data.pop('client_email', '').strip()
        validated_data['end_time'] = validated_data['start_time'] + timedelta(minutes=PUBLIC_BOOKING_DURATION_MINUTES)
        self._validate_slot_conflict(validated_data)
        validated_data['status'] = Booking.STATUS_PENDING

        if email:
            validated_data['client'] = self._get_or_create_client(
                validated_data.get('requester_name', ''),
                validated_data.get('requester_phone', ''),
                email,
            )
        else:
            validated_data['client'] = None

        return super().create(validated_data)
