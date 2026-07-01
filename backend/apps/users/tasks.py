import logging
from datetime import date
from celery import shared_task
from django.contrib.auth import get_user_model
from apps.notifications.services import create_in_app_notification

logger = logging.getLogger(__name__)
User = get_user_model()


def _next_birthday(birth_date: date, today: date) -> date:
    try:
        next_bday = date(today.year, birth_date.month, birth_date.day)
    except ValueError:
        next_bday = date(today.year, 2, 28)
    if next_bday < today:
        try:
            next_bday = date(today.year + 1, birth_date.month, birth_date.day)
        except ValueError:
            next_bday = date(today.year + 1, 2, 28)
    return next_bday


@shared_task
def notify_upcoming_birthdays():
    """Ежедневная проверка дней рождения: уведомляет сотрудников о сегодняшних и ближайших ДР."""
    today = date.today()
    birthday_users = []
    for user in User.objects.filter(birth_date__isnull=False, is_active=True):
        next_bday = _next_birthday(user.birth_date, today)
        delta = (next_bday - today).days
        if 0 <= delta <= 1:
            birthday_users.append((user, next_bday, delta))

    if not birthday_users:
        logger.info('Нет дней рождения в ближайшие 2 дня')
        return 0

    recipients = User.objects.filter(is_active=True)
    created = 0
    for user, next_bday, delta in birthday_users:
        if delta == 0:
            title = '🎂 Сегодня день рождения!'
            message = f'Сегодня день рождения у {user.get_short_name()}'
        else:
            title = '🎂 Завтра день рождения'
            message = f'Завтра день рождения у {user.get_short_name()}'
        for recipient in recipients:
            if recipient.id == user.id:
                continue
            try:
                create_in_app_notification(
                    user=recipient,
                    title=title,
                    message=message,
                    link='/users',
                )
                created += 1
            except Exception as e:
                logger.error('Ошибка создания уведомления о дне рождения: %s', e)
    logger.info('Создано %s уведомлений о днях рождения', created)
    return created
