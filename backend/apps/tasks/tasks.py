import logging
from datetime import timedelta
from celery import shared_task
from django.utils import timezone
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
        qs.update(is_archived=True)
        logger.info('Архивировано %s выполненных задач, обновленных раньше %s', count, cutoff)
    else:
        logger.debug('Нет выполненных задач для архивации')
    return count
