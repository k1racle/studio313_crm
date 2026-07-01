import logging
from datetime import timedelta
from celery import shared_task
from django.utils import timezone
from .models import Publication

logger = logging.getLogger(__name__)


@shared_task
def send_media_plan_reminders():
    now = timezone.now()
    window_end = now + timedelta(hours=24)
    qs = Publication.objects.filter(
        status__in=[Publication.STATUS_DRAFT, Publication.STATUS_APPROVAL, Publication.STATUS_SCHEDULED],
        publish_at__gte=now,
        publish_at__lte=window_end,
        reminder_sent_at__isnull=True,
    )
    count = 0
    for pub in qs:
        if pub.responsible:
            title = 'Напоминание о публикации'
            message = f'«{pub.title}» запланирована на {pub.publish_at.strftime("%d.%m.%Y %H:%M")}'
            try:
                from apps.notifications.services import create_in_app_notification
                from apps.notifications.tasks import notify_user_task
                create_in_app_notification(pub.responsible, title, message)
                notify_user_task.delay(pub.responsible.id, title, message)
                count += 1
            except Exception as e:
                logger.exception('Ошибка отправки напоминания о публикации %s: %s', pub.id, e)
                continue
        pub.reminder_sent_at = now
        pub.save(update_fields=['reminder_sent_at'])
    logger.info('Отправлено %s напоминаний о публикациях', count)
    return count
