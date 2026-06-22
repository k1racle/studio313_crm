from rest_framework import serializers
from .models import Payment, PaymentSettings


class PaymentSerializer(serializers.ModelSerializer):
    booking_info = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = ['id', 'booking', 'booking_info', 'amount', 'status', 'transaction_id', 'payment_url', 'bank_order_id', 'created_at', 'updated_at']
        read_only_fields = ['status', 'transaction_id', 'payment_url', 'bank_order_id', 'created_at', 'updated_at']

    def get_booking_info(self, obj):
        return {
            'id': obj.booking.id,
            'client': obj.booking.client.name if obj.booking.client else None,
            'service': obj.booking.service.name if obj.booking.service else None,
        }


class PaymentSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentSettings
        fields = ['test_mode', 'username', 'password', 'token', 'base_url']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'username': {'required': False},
            'token': {'required': False},
            'base_url': {'required': False},
        }
