from celery import shared_task
from apps.users.models import User
from .services import send_email_notification, send_sms_notification, send_telegram_notification, send_max_notification, get_user_notification_preference


@shared_task
def notify_user_task(user_id, subject, body, channels=None):
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return

    pref = get_user_notification_preference(user)

    if channels is None:
        channels = []
        if pref.email_enabled:
            channels.append('email')
        if pref.telegram_enabled:
            channels.append('telegram')
        if pref.max_enabled:
            channels.append('max')
        if pref.sms_enabled:
            channels.append('sms')

    for channel in channels:
        if channel == 'email' and pref.email_enabled:
            send_email_notification(user, subject, body)
        elif channel == 'sms' and pref.sms_enabled:
            send_sms_notification(user, body)
        elif channel == 'telegram' and pref.telegram_enabled:
            send_telegram_notification(user, body)
        elif channel == 'max' and pref.max_enabled:
            send_max_notification(user, body)
