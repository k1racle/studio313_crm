from django.contrib import admin
from .models import NotificationLog, InAppNotification, UserNotificationPreference, PushSubscription


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'channel', 'subject', 'sent_at', 'is_success']
    list_filter = ['channel', 'is_success', 'sent_at']


@admin.register(InAppNotification)
class InAppNotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']


@admin.register(UserNotificationPreference)
class UserNotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'email_enabled', 'telegram_enabled', 'sms_enabled', 'push_enabled']
    list_filter = ['email_enabled', 'telegram_enabled', 'sms_enabled', 'push_enabled']


@admin.register(PushSubscription)
class PushSubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'endpoint', 'created_at']
    list_filter = ['created_at']
