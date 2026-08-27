import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from apps.notifications.models import InAppNotification, NotificationLog
from apps.notifications.services import create_in_app_notification
from apps.notifications.tasks import notify_user_task
from .models import Task

logger = logging.getLogger(__name__)


@shared_task
def archive_done_tasks_after_24h():
    cutoff = timezone.now() - timedelta(hours=24)
    qs = Task.objects.filter(
        status=Task.STATUS_DONE,
        is_archived=False,
        updated_at__lt=cutoff,
    )
    count = qs.count()
    if count:
        qs.update(is_archived=True, archived_at=timezone.now())
        logger.info('Архивировано %s выполненных задач, обновленных раньше %s', count, cutoff)
    else:
        logger.debug('Нет выполненных задач для архивации')
    return count


@shared_task
def send_task_deadline_reminders():
    now = timezone.now()
    today = timezone.localdate()
    threshold = now + timedelta(hours=24)
    tasks = (
        Task.objects.filter(
            is_archived=False,
            due_date__isnull=False,
            due_date__gte=now,
            due_date__lte=threshold,
        )
        .exclude(status__in=[Task.STATUS_DONE, Task.STATUS_CANCELED])
        .prefetch_related('assignees', 'members')
        .select_related('project')
    )

    sent = 0
    for task in tasks:
        recipients = {
            user.id: user
            for user in list(task.assignees.all()) + list(task.members.all())
            if user.is_active
        }
        if not recipients:
            continue

        due_label = timezone.localtime(task.due_date).strftime('%d.%m.%Y %H:%M')
        project_label = task.project.name if task.project else 'без проекта'
        subject = f'Напоминание о дедлайне задачи #{task.id}'
        body = (
            f'Срок по задаче #{task.id} «{task.title}» истекает {due_label}. '
            f'Статус: {task.get_status_display()}. Проект: {project_label}.'
        )

        for user in recipients.values():
            notification_link = f'/tasks/{task.id}'
            already_notified_today = InAppNotification.objects.filter(
                user=user,
                title='Близкий дедлайн',
                link=notification_link,
                created_at__date=today,
            ).exists()
            already_sent = NotificationLog.objects.filter(
                user=user,
                body=body,
                sent_at__date=today,
                channel__in=[NotificationLog.CHANNEL_TELEGRAM, NotificationLog.CHANNEL_MAX],
                is_success=True,
            ).exists()
            if already_notified_today or already_sent:
                continue

            create_in_app_notification(
                user=user,
                title='Близкий дедлайн',
                message=body,
                link=notification_link,
            )
            notify_user_task.delay(user.id, subject, body, channels=['telegram', 'max'])
            sent += 1

    logger.info('Отправлено %s напоминаний о дедлайнах задач', sent)
    return sent
