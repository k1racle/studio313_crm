from rest_framework import serializers
from .models import InAppNotification, UserNotificationPreference


class InAppNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = InAppNotification
        fields = ['id', 'title', 'message', 'link', 'is_read', 'created_at']
        read_only_fields = ['id', 'title', 'message', 'link', 'created_at']


class UserNotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserNotificationPreference
        fields = ['email_enabled', 'telegram_enabled', 'sms_enabled']
