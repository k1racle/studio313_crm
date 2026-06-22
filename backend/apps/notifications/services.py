import logging
from django.core.mail import send_mail
from django.conf import settings
from .models import NotificationLog, InAppNotification

logger = logging.getLogger(__name__)


def send_email_notification(user, subject, body, html_body=None):
    if not user.email:
        logger.warning(f'У пользователя {user} не указан email')
        return False

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_body,
            fail_silently=False,
        )
        NotificationLog.objects.create(
            user=user,
            channel=NotificationLog.CHANNEL_EMAIL,
            subject=subject,
            body=body,
            is_success=True,
        )
        return True
    except Exception as e:
        logger.error(f'Ошибка отправки email: {e}')
        NotificationLog.objects.create(
            user=user,
            channel=NotificationLog.CHANNEL_EMAIL,
            subject=subject,
            body=body,
            is_success=False,
            error_message=str(e),
        )
        return False


def send_sms_notification(user, body):
    logger.info(f'[SMS заглушка] Пользователю {user}: {body}')
    NotificationLog.objects.create(
        user=user,
        channel=NotificationLog.CHANNEL_SMS,
        subject='SMS',
        body=body,
        is_success=False,
        error_message='SMS-провайдер не настроен',
    )
    return False


def send_telegram_notification(user, text):
    if not user.telegram_id:
        logger.warning(f'У пользователя {user} не привязан Telegram')
        return False
    try:
        from apps.telegram_bot.tasks import send_telegram_message
        send_telegram_message.delay(user.telegram_id, text)
        NotificationLog.objects.create(
            user=user,
            channel=NotificationLog.CHANNEL_TELEGRAM,
            subject='Telegram',
            body=text,
            is_success=True,
        )
        return True
    except Exception as e:
        logger.error(f'Ошибка отправки Telegram-уведомления: {e}')
        NotificationLog.objects.create(
            user=user,
            channel=NotificationLog.CHANNEL_TELEGRAM,
            subject='Telegram',
            body=text,
            is_success=False,
            error_message=str(e),
        )
        return False


def create_in_app_notification(user, title, message, link=''):
    if not user:
        return None
    return InAppNotification.objects.create(
        user=user,
        title=title,
        message=message,
        link=link,
    )


def get_user_notification_preference(user):
    pref, _ = UserNotificationPreference.objects.get_or_create(user=user)
    return pref
