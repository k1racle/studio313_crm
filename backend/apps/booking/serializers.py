from rest_framework import serializers
from .models import Service, Booking
from apps.clients.models import Client
from apps.clients.serializers import ClientSerializer


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'name', 'description', 'duration_minutes', 'price', 'is_active']


class BookingSerializer(serializers.ModelSerializer):
    client = ClientSerializer(read_only=True)
    client_id = serializers.PrimaryKeyRelatedField(source='client', queryset=Client.objects.all(), write_only=True, required=False)
    service = ServiceSerializer(read_only=True)
    service_id = serializers.PrimaryKeyRelatedField(source='service', queryset=Service.objects.all(), write_only=True)
    client_name = serializers.CharField(write_only=True, required=False)
    client_phone = serializers.CharField(write_only=True, required=False)
    remaining_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Booking
        fields = ['id', 'client', 'client_id', 'client_name', 'client_phone', 'service', 'service_id', 'start_time', 'end_time', 'status', 'paid_amount', 'remaining_amount', 'notes', 'created_at']
        read_only_fields = ['end_time', 'paid_amount', 'remaining_amount', 'created_at']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['remaining_amount'] = max(instance.service.price - instance.paid_amount, 0)
        return ret

    def _set_end_time(self, validated_data):
        service = validated_data.get('service')
        start_time = validated_data.get('start_time')
        if service and start_time:
            from datetime import timedelta
            validated_data['end_time'] = start_time + timedelta(minutes=service.duration_minutes)

    def create(self, validated_data):
        client_name = validated_data.pop('client_name', None)
        client_phone = validated_data.pop('client_phone', None)
        if 'client' not in validated_data and client_name:
            client, _ = Client.objects.get_or_create(
                phone=client_phone or '',
                defaults={'name': client_name}
            )
            validated_data['client'] = client
        self._set_end_time(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'service' in validated_data or 'start_time' in validated_data:
            validated_data.setdefault('service', instance.service)
            validated_data.setdefault('start_time', instance.start_time)
            self._set_end_time(validated_data)
        return super().update(instance, validated_data)


class PublicBookingSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(write_only=True)
    client_phone = serializers.CharField(write_only=True)
    service_id = serializers.PrimaryKeyRelatedField(source='service', queryset=Service.objects.all(), write_only=True)

    class Meta:
        model = Booking
        fields = ['id', 'client_name', 'client_phone', 'service_id', 'start_time', 'end_time', 'status', 'notes', 'created_at']
        read_only_fields = ['end_time', 'status', 'created_at']

    def create(self, validated_data):
        from datetime import timedelta
        client_name = validated_data.pop('client_name')
        client_phone = validated_data.pop('client_phone', '')
        client, _ = Client.objects.get_or_create(
            phone=client_phone,
            defaults={'name': client_name}
        )
        validated_data['client'] = client
        validated_data['status'] = Booking.STATUS_PENDING
        service = validated_data.get('service')
        start_time = validated_data.get('start_time')
        if service and start_time:
            validated_data['end_time'] = start_time + timedelta(minutes=service.duration_minutes)
        return super().create(validated_data)
