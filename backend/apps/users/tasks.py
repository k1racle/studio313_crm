import logging

from celery import shared_task
from django.contrib.auth import get_user_model

from apps.notifications.services import create_in_app_notification
from .birthdays import collect_birthdays

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task
def notify_upcoming_birthdays():
    birthday_items = collect_birthdays(window_days=1)
    if not birthday_items:
        logger.info('Нет дней рождения в ближайшие 2 дня')
        return 0

    recipients = User.objects.filter(is_active=True)
    created = 0
    kind_labels = {
        'employee': 'сотрудника',
        'client': 'клиента',
        'contact': 'контакта',
    }

    for item in birthday_items:
        delta = item['days_until']
        name = item['full_name']
        label = kind_labels.get(item['kind'], 'контакта')
        title = 'Сегодня день рождения' if delta == 0 else 'Завтра день рождения'
        message = f'{"Сегодня" if delta == 0 else "Завтра"} день рождения у {label} {name}'

        for recipient in recipients:
            if item['kind'] == 'employee' and recipient.id == item['entity_id']:
                continue
            try:
                create_in_app_notification(
                    user=recipient,
                    title=title,
                    message=message,
                    link=item['link'],
                )
                created += 1
            except Exception as exc:
                logger.error('Ошибка создания уведомления о дне рождения: %s', exc)

    logger.info('Создано %s уведомлений о днях рождения', created)
    return created
