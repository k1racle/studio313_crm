from datetime import timedelta

from celery import shared_task
from django.db.models import Q
from django.utils import timezone

from apps.notifications.services import create_in_app_notification
from apps.notifications.tasks import notify_user_task
from apps.users.models import User

from .models import PaymentPlan, PlannedPayment
from .planning import sync_plan_occurrences


def get_plan_recipients(plan):
    responsible = list(plan.responsible.all())
    if responsible:
        return responsible
    return list(User.objects.filter(
        Q(role__in=[User.ROLE_MANAGER, User.ROLE_DIRECTOR, User.ROLE_ADMIN])
        | Q(is_staff=True)
        | Q(is_superuser=True)
    ).distinct())


@shared_task
def send_planned_payment_reminders():
    today = timezone.localdate()
    horizon = today + timedelta(days=90)

    for plan in PaymentPlan.objects.filter(is_active=True).prefetch_related('responsible'):
        sync_plan_occurrences(plan, today, horizon)

    occurrences = PlannedPayment.objects.select_related('plan').prefetch_related('plan__responsible').filter(
        status=PlannedPayment.STATUS_SCHEDULED,
        reminder_sent_at__isnull=True,
        due_date__gte=today,
        due_date__lte=horizon,
        plan__is_active=True,
    )

    sent_count = 0
    for occurrence in occurrences:
        reminder_date = occurrence.due_date - timedelta(days=occurrence.plan.reminder_days)
        if reminder_date > today:
            continue

        days_left = (occurrence.due_date - today).days
        timing = 'сегодня' if days_left == 0 else f'через {days_left} дн.'
        title = f'Платеж {timing}: {occurrence.plan.title}'
        message = (
            f'{occurrence.plan.counterparty} — {occurrence.amount} ₽. '
            f'Оплатить до {occurrence.due_date:%d.%m.%Y}. '
            'Служебная записка доступна в календаре платежей.'
        )

        recipients = get_plan_recipients(occurrence.plan)
        if not recipients:
            continue
        for user in recipients:
            create_in_app_notification(user, title, message, '/payment-calendar')
            notify_user_task.delay(user.id, title, message)

        occurrence.reminder_sent_at = timezone.now()
        occurrence.save(update_fields=['reminder_sent_at'])
        sent_count += 1

    return sent_count
