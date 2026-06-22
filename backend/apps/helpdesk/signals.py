from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import HelpdeskTicket


@receiver(post_save, sender=HelpdeskTicket)
def notify_assignee_on_ticket_assign(sender, instance, created, **kwargs):
    if not created and instance.assignee:
        subject = f'Вам назначено обращение #{instance.id}: {instance.subject}'
        body = (
            f'Вам назначено обращение в хелпдеск.\n\n'
            f'Тема: {instance.subject}\n'
            f'Приоритет: {instance.get_priority_display()}\n'
            f'Описание: {instance.description}'
        )
        from apps.notifications.tasks import notify_user_task
        notify_user_task.delay(instance.assignee.id, subject, body)
