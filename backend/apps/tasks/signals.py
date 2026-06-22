from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Task


@receiver(post_save, sender=Task)
def notify_assignee_on_task_create(sender, instance, created, **kwargs):
    if created and instance.assignee:
        subject = f'Новая задача #{instance.id}: {instance.title}'
        body = (
            f'Вам назначена новая задача.\n\n'
            f'Название: {instance.title}\n'
            f'Приоритет: {instance.get_priority_display()}\n'
            f'Описание: {instance.description or "—"}'
        )
        from apps.notifications.tasks import notify_user_task
        notify_user_task.delay(instance.assignee.id, subject, body)
