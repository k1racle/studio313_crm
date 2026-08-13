from __future__ import annotations

from datetime import timedelta

from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone

from apps.helpdesk.models import HelpdeskTicket
from apps.tasks.models import Task
from apps.users.birthdays import collect_birthdays
from apps.users.models import User

PLATFORM_TELEGRAM = 'telegram'
PLATFORM_MAX = 'max'

ACTION_MENU = 'menu'
ACTION_CREATE_TASK = 'create_task'
ACTION_CREATE_TICKET = 'create_ticket'
ACTION_MY_TASKS = 'my_tasks'
ACTION_DEADLINES = 'deadlines'
ACTION_BIRTHDAYS = 'birthdays'
ACTION_CRM_STATUS = 'crm_status'
ACTION_LINK = 'link'
ACTION_HELP = 'help'

MAIN_MENU_ROWS = [
    [('📝 Создать задачу', ACTION_CREATE_TASK), ('📩 Helpdesk', ACTION_CREATE_TICKET)],
    [('📋 Мои задачи', ACTION_MY_TASKS), ('⏰ Дедлайны', ACTION_DEADLINES)],
    [('🎂 Дни рождения', ACTION_BIRTHDAYS), ('🔗 CRM', ACTION_CRM_STATUS)],
    [('❓ Помощь', ACTION_HELP)],
]

PENDING_STATE_TIMEOUT = 20 * 60


def _state_cache_key(platform: str, chat_id: str | int) -> str:
    return f'bot-assistant:{platform}:{chat_id}:pending'


def set_pending_action(platform: str, chat_id: str | int, action: str) -> None:
    cache.set(_state_cache_key(platform, chat_id), action, timeout=PENDING_STATE_TIMEOUT)


def get_pending_action(platform: str, chat_id: str | int) -> str | None:
    return cache.get(_state_cache_key(platform, chat_id))


def clear_pending_action(platform: str, chat_id: str | int) -> None:
    cache.delete(_state_cache_key(platform, chat_id))


def get_linked_user(platform: str, external_user_id: str | int | None) -> User | None:
    if not external_user_id:
        return None

    external_user_id = str(external_user_id)
    if platform == PLATFORM_TELEGRAM:
        return User.objects.filter(telegram_id=external_user_id, is_active=True).first()
    if platform == PLATFORM_MAX:
        return User.objects.filter(max_id=external_user_id, is_active=True).first()
    return None


def build_link_help_text(platform: str) -> str:
    platform_label = 'Telegram' if platform == PLATFORM_TELEGRAM else 'MAX'
    return (
        f'🔗 CRM пока не подключена.\n\n'
        f'1. Откройте профиль в CRM.\n'
        f'2. Сгенерируйте код привязки для {platform_label}.\n'
        f'3. Отправьте его сюда командой `/link КОД` '
        f'или нажмите кнопку «CRM» и пришлите код следующим сообщением.'
    )


def build_help_text(platform: str) -> str:
    platform_label = 'Telegram' if platform == PLATFORM_TELEGRAM else 'MAX'
    return (
        f'Я бот CRM Studio 313 для {platform_label}.\n\n'
        f'Что умею:\n'
        f'• создавать задачи\n'
        f'• создавать заявки в helpdesk\n'
        f'• показывать ваши задачи и статусы\n'
        f'• напоминать о дедлайнах\n'
        f'• показывать ближайшие дни рождения сотрудников\n'
        f'• проверять статус подключения к CRM\n\n'
        f'Для персональных данных CRM сначала привяжите аккаунт через `/link КОД`.'
    )


def build_menu_caption(platform: str, external_user_id: str | int | None) -> str:
    user = get_linked_user(platform, external_user_id)
    if user:
        return (
            f'CRM-ассистент Studio 313\n'
            f'Подключено: {user.get_full_name()} ({user.get_role_display()})\n'
            f'Выберите действие ниже.'
        )
    return (
        'CRM-ассистент Studio 313\n'
        'Аккаунт CRM пока не подключён.\n'
        'Доступны helpdesk, помощь и привязка аккаунта.'
    )


def _task_source_for_platform(platform: str) -> str:
    return Task.SOURCE_TELEGRAM if platform == PLATFORM_TELEGRAM else Task.SOURCE_MAX


def _ticket_source_for_platform(platform: str) -> str:
    return HelpdeskTicket.SOURCE_TELEGRAM if platform == PLATFORM_TELEGRAM else HelpdeskTicket.SOURCE_MAX


def _trim_title(text: str, limit: int = 120) -> str:
    text = ' '.join((text or '').split()).strip()
    if not text:
        return ''
    if len(text) <= limit:
        return text
    return text[:limit].rstrip() + '...'


def create_task_from_private_message(
    platform: str,
    external_user_id: str | int | None,
    text: str,
    sender_name: str = '',
) -> tuple[Task | None, str]:
    linked_user = get_linked_user(platform, external_user_id)
    if not linked_user:
        return None, build_link_help_text(platform)

    title = _trim_title(text)
    if not title:
        return None, 'Нужен непустой текст задачи.'

    description = text.strip()
    if sender_name:
        description = f'Создано через бот от {sender_name}\n\n{description}'

    task = Task.objects.create(
        title=title,
        description=description,
        source=_task_source_for_platform(platform),
        status=Task.STATUS_NEW,
        creator=linked_user,
    )
    task.assignees.add(linked_user)
    return (
        task,
        f'✅ Задача создана: #{task.id}\n'
        f'{task.title}\n'
        f'Статус: {task.get_status_display()}',
    )


def create_helpdesk_ticket_from_private_message(
    platform: str,
    text: str,
    sender_name: str = '',
    sender_contact: str = '',
) -> tuple[HelpdeskTicket | None, str]:
    title = _trim_title(text, limit=100)
    if not title:
        return None, 'Нужен непустой текст обращения.'

    ticket = HelpdeskTicket.objects.create(
        subject=title,
        description=text.strip(),
        source=_ticket_source_for_platform(platform),
        requester_name=sender_name,
        requester_contact=sender_contact,
    )
    return (
        ticket,
        f'📩 Заявка в helpdesk создана: #{ticket.id}\n'
        f'{ticket.subject}\n'
        f'Статус: {ticket.get_status_display()}',
    )


def format_user_tasks(platform: str, external_user_id: str | int | None, limit: int = 7) -> str:
    linked_user = get_linked_user(platform, external_user_id)
    if not linked_user:
        return build_link_help_text(platform)

    tasks = list(
        Task.objects.filter(
            Q(assignees=linked_user) | Q(members=linked_user),
            is_archived=False,
        )
        .exclude(status__in=[Task.STATUS_DONE, Task.STATUS_CANCELED])
        .distinct()
        .select_related('project', 'client')
        .order_by('due_date', '-created_at')[:limit]
    )

    if not tasks:
        return '📋 У вас сейчас нет активных задач.'

    lines = ['📋 Ваши задачи:']
    for task in tasks:
        due = task.due_date.strftime('%d.%m %H:%M') if task.due_date else 'без срока'
        project = task.project.name if task.project else 'без проекта'
        lines.append(
            f'• #{task.id} {task.title}\n'
            f'  Статус: {task.get_status_display()} | Срок: {due} | Проект: {project}'
        )
    return '\n'.join(lines)


def format_upcoming_deadlines(platform: str, external_user_id: str | int | None, days: int = 7, limit: int = 7) -> str:
    linked_user = get_linked_user(platform, external_user_id)
    if not linked_user:
        return build_link_help_text(platform)

    now = timezone.now()
    threshold = now + timedelta(days=days)
    tasks = list(
        Task.objects.filter(
            Q(assignees=linked_user) | Q(members=linked_user),
            is_archived=False,
            due_date__isnull=False,
            due_date__gte=now,
            due_date__lte=threshold,
        )
        .exclude(status__in=[Task.STATUS_DONE, Task.STATUS_CANCELED])
        .distinct()
        .select_related('project')
        .order_by('due_date')[:limit]
    )

    if not tasks:
        return f'⏰ На ближайшие {days} дней дедлайнов нет.'

    lines = [f'⏰ Ближайшие дедлайны на {days} дней:']
    for task in tasks:
        project = task.project.name if task.project else 'без проекта'
        lines.append(
            f'• #{task.id} {task.title}\n'
            f'  До: {task.due_date.strftime("%d.%m %H:%M")} | Статус: {task.get_status_display()} | Проект: {project}'
        )
    return '\n'.join(lines)


def format_birthdays(window_days: int = 7) -> str:
    employees = [item for item in collect_birthdays(window_days=window_days) if item['kind'] == 'employee']
    if not employees:
        return f'🎂 В ближайшие {window_days} дней дней рождения сотрудников нет.'

    lines = [f'🎂 Дни рождения сотрудников на {window_days} дней:']
    for item in employees:
        prefix = 'Сегодня' if item['is_today'] else f'Через {item["days_until"]} дн.'
        lines.append(
            f'• {item["full_name"]} — {prefix}, {item["next_birthday"][8:10]}.{item["next_birthday"][5:7]}'
        )
    return '\n'.join(lines)


def format_crm_status(platform: str, external_user_id: str | int | None) -> str:
    linked_user = get_linked_user(platform, external_user_id)
    if not linked_user:
        return build_link_help_text(platform)

    active_tasks = (
        Task.objects.filter(Q(assignees=linked_user) | Q(members=linked_user), is_archived=False)
        .exclude(status__in=[Task.STATUS_DONE, Task.STATUS_CANCELED])
        .distinct()
        .count()
    )
    upcoming_deadlines = (
        Task.objects.filter(
            Q(assignees=linked_user) | Q(members=linked_user),
            is_archived=False,
            due_date__isnull=False,
            due_date__gte=timezone.now(),
            due_date__lte=timezone.now() + timedelta(days=7),
        )
        .exclude(status__in=[Task.STATUS_DONE, Task.STATUS_CANCELED])
        .distinct()
        .count()
    )
    assigned_tickets = HelpdeskTicket.objects.filter(
        assignee=linked_user,
        status__in=[
            HelpdeskTicket.STATUS_OPEN,
            HelpdeskTicket.STATUS_IN_PROGRESS,
            HelpdeskTicket.STATUS_WAITING,
        ],
    ).count()

    return (
        f'🔗 CRM подключена\n'
        f'Профиль: {linked_user.get_full_name()}\n'
        f'Роль: {linked_user.get_role_display()}\n'
        f'Активных задач: {active_tasks}\n'
        f'Дедлайнов на 7 дней: {upcoming_deadlines}\n'
        f'Тикетов на вас: {assigned_tickets}'
    )


def handle_menu_action(platform: str, action: str, external_user_id: str | int | None, chat_id: str | int) -> str:
    clear_pending_action(platform, chat_id)

    if action == ACTION_MENU:
        return build_menu_caption(platform, external_user_id)
    if action == ACTION_HELP:
        return build_help_text(platform)
    if action == ACTION_CREATE_TASK:
        if not get_linked_user(platform, external_user_id):
            return build_link_help_text(platform)
        set_pending_action(platform, chat_id, ACTION_CREATE_TASK)
        return '📝 Пришлите текст задачи одним сообщением. Я создам её в CRM и назначу на вас.'
    if action == ACTION_CREATE_TICKET:
        set_pending_action(platform, chat_id, ACTION_CREATE_TICKET)
        return '📩 Пришлите текст обращения одним сообщением. Я создам заявку в helpdesk.'
    if action == ACTION_MY_TASKS:
        return format_user_tasks(platform, external_user_id)
    if action == ACTION_DEADLINES:
        return format_upcoming_deadlines(platform, external_user_id)
    if action == ACTION_BIRTHDAYS:
        return format_birthdays()
    if action == ACTION_CRM_STATUS:
        return format_crm_status(platform, external_user_id)
    if action == ACTION_LINK:
        set_pending_action(platform, chat_id, ACTION_LINK)
        return '🔗 Пришлите код привязки из профиля CRM одним сообщением.'
    return build_menu_caption(platform, external_user_id)


def link_platform_account(platform: str, code: str, external_user_id: str | int) -> tuple[User | None, str]:
    code = (code or '').strip()
    if not code:
        return None, 'Код привязки пустой.'

    if platform == PLATFORM_TELEGRAM:
        from apps.telegram_bot.models import TelegramLinkCode

        try:
            link_code = TelegramLinkCode.objects.select_related('user').get(code=code)
        except TelegramLinkCode.DoesNotExist:
            return None, 'Неверный код привязки. Сгенерируйте новый код в профиле CRM.'
        if link_code.is_expired():
            return None, 'Код привязки истёк. Сгенерируйте новый код в профиле CRM.'
        user = link_code.user
        user.telegram_id = str(external_user_id)
        user.save(update_fields=['telegram_id'])
        link_code.delete()
        return user, f'✅ Telegram подключён к CRM-профилю: {user.get_full_name()}'

    if platform == PLATFORM_MAX:
        from apps.max_bot.models import MaxLinkCode

        try:
            link_code = MaxLinkCode.objects.select_related('user').get(code=code)
        except MaxLinkCode.DoesNotExist:
            return None, 'Неверный код привязки. Сгенерируйте новый код в профиле CRM.'
        if link_code.is_expired():
            return None, 'Код привязки истёк. Сгенерируйте новый код в профиле CRM.'
        user = link_code.user
        user.max_id = str(external_user_id)
        user.save(update_fields=['max_id'])
        link_code.delete()
        return user, f'✅ MAX подключён к CRM-профилю: {user.get_full_name()}'

    return None, 'Неизвестная платформа привязки.'
