import json
import logging
from django.core.mail import send_mail
from django.conf import settings
from .models import NotificationLog, InAppNotification, PushSubscription

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
    notification = InAppNotification.objects.create(
        user=user,
        title=title,
        message=message,
        link=link,
    )
    send_push_notification(user, title, message, link)
    return notification


def get_user_notification_preference(user):
    pref, _ = UserNotificationPreference.objects.get_or_create(user=user)
    return pref


def send_push_notification(user, title, message, link=''):
    if not settings.WEB_PUSH_ENABLED:
        return False
    pref = get_user_notification_preference(user)
    if not pref.push_enabled:
        return False

    subscriptions = PushSubscription.objects.filter(user=user)
    if not subscriptions.exists():
        return False

    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        logger.error('pywebpush не установлен')
        return False

    payload = json.dumps({
        'title': title,
        'message': message,
        'link': link,
    })

    sent = 0
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    'endpoint': sub.endpoint,
                    'keys': {'p256dh': sub.p256dh, 'auth': sub.auth},
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={'sub': f'mailto:{settings.VAPID_ADMIN_EMAIL}'},
            )
            sent += 1
        except WebPushException as e:
            logger.warning(f'Ошибка отправки push для {user}: {e}')
            if e.response and e.response.status_code in (404, 410):
                sub.delete()
        except Exception as e:
            logger.error(f'Неожиданная ошибка push для {user}: {e}')

    return sent > 0
