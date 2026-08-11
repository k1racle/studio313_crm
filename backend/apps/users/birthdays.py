from datetime import date

from apps.clients.models import Client
from apps.contacts.models import Contact
from apps.users.models import User


def next_birthday_date(birth_date: date, today: date) -> date:
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


def collect_birthdays(window_days=7):
    today = date.today()
    items = []

    for user in User.objects.filter(birth_date__isnull=False, is_active=True):
        next_bday = next_birthday_date(user.birth_date, today)
        delta = (next_bday - today).days
        if 0 <= delta <= window_days:
            items.append({
                'kind': 'employee',
                'entity_id': user.id,
                'full_name': user.get_short_name(),
                'badge_name': f'Сотрудник: {user.get_short_name()}',
                'birth_date': user.birth_date.isoformat(),
                'next_birthday': next_bday.isoformat(),
                'days_until': delta,
                'is_today': delta == 0,
                'link': '/',
            })

    for client in Client.objects.filter(birthday__isnull=False, is_archived=False):
        next_bday = next_birthday_date(client.birthday, today)
        delta = (next_bday - today).days
        if 0 <= delta <= window_days:
            items.append({
                'kind': 'client',
                'entity_id': client.id,
                'full_name': client.name,
                'badge_name': f'Клиент: {client.name}',
                'birth_date': client.birthday.isoformat(),
                'next_birthday': next_bday.isoformat(),
                'days_until': delta,
                'is_today': delta == 0,
                'link': '/clients',
            })

    for contact in Contact.objects.filter(birth_date__isnull=False):
        next_bday = next_birthday_date(contact.birth_date, today)
        delta = (next_bday - today).days
        if 0 <= delta <= window_days:
            items.append({
                'kind': 'contact',
                'entity_id': contact.id,
                'full_name': contact.full_name,
                'badge_name': f'Контакт: {contact.full_name}',
                'birth_date': contact.birth_date.isoformat(),
                'next_birthday': next_bday.isoformat(),
                'days_until': delta,
                'is_today': delta == 0,
                'link': '/contacts',
            })

    items.sort(key=lambda item: (item['days_until'], item['kind'], item['full_name']))
    return items
