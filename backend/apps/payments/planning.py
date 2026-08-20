from datetime import timedelta

from dateutil.relativedelta import relativedelta
from django.utils import timezone

from .models import PaymentPlan, PlannedPayment


def get_occurrence_date(plan, index):
    if plan.frequency == PaymentPlan.FREQUENCY_ONCE:
        return plan.start_date if index == 0 else None
    if plan.frequency == PaymentPlan.FREQUENCY_WEEKLY:
        return plan.start_date + timedelta(weeks=index)
    if plan.frequency == PaymentPlan.FREQUENCY_MONTHLY:
        return plan.start_date + relativedelta(months=index)
    if plan.frequency == PaymentPlan.FREQUENCY_QUARTERLY:
        return plan.start_date + relativedelta(months=index * 3)
    if plan.frequency == PaymentPlan.FREQUENCY_YEARLY:
        return plan.start_date + relativedelta(years=index)
    return None


def sync_plan_occurrences(plan, range_start=None, range_end=None):
    """Materialize plan dates for a requested calendar window."""
    today = timezone.localdate()
    range_start = range_start or min(plan.start_date, today - timedelta(days=31))
    range_end = range_end or max(plan.start_date, today) + relativedelta(months=18)

    created = []
    for index in range(2000):
        due_date = get_occurrence_date(plan, index)
        if due_date is None or due_date > range_end:
            break
        if plan.end_date and due_date > plan.end_date:
            break
        if due_date >= range_start:
            occurrence, was_created = PlannedPayment.objects.get_or_create(
                plan=plan,
                due_date=due_date,
                defaults={'amount': plan.amount},
            )
            if not was_created and occurrence.status == PlannedPayment.STATUS_SCHEDULED and occurrence.amount != plan.amount:
                occurrence.amount = plan.amount
                occurrence.save(update_fields=['amount'])
            if was_created:
                created.append(occurrence)

    return created
