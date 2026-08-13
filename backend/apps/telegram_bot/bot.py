import asyncio
import logging
import random
import re

import httpx
from asgiref.sync import sync_to_async
from config import socks5_ipv4_patch  # noqa: F401
from django.conf import settings
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.error import NetworkError
from telegram.ext import (
    ApplicationBuilder,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)
from telegram.request import BaseRequest, HTTPXRequest

from apps.bot_assistant import (
    ACTION_CREATE_TASK,
    ACTION_CREATE_TICKET,
    ACTION_LINK,
    ACTION_MENU,
    MAIN_MENU_ROWS,
    PLATFORM_TELEGRAM,
    build_help_text,
    build_link_help_text,
    build_menu_caption,
    clear_pending_action,
    create_helpdesk_ticket_from_private_message,
    create_task_from_private_message,
    get_pending_action,
    handle_menu_action,
    link_platform_account,
)
from apps.tasks.models import Task
from apps.users.models import User
from .models import NewsSuggestion, TelegramChat, TelegramMessage

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO,
)
logger = logging.getLogger(__name__)
logging.getLogger('telegram').setLevel(logging.INFO)
logging.getLogger('httpx').setLevel(logging.WARNING)


def build_main_menu_markup() -> InlineKeyboardMarkup:
    rows = [
        [InlineKeyboardButton(text, callback_data=f'crm:{action}') for text, action in row]
        for row in MAIN_MENU_ROWS
    ]
    rows.append([InlineKeyboardButton('♻️ Обновить меню', callback_data=f'crm:{ACTION_MENU}')])
    rows.append([InlineKeyboardButton('🔗 Подключить CRM', callback_data='crm:link')])
    return InlineKeyboardMarkup(rows)


async def send_menu_message(target, text: str):
    return await target.reply_text(text, reply_markup=build_main_menu_markup())


class CustomHTTPXRequest(BaseRequest):
    """HTTPX request adapter for Telegram Bot API with proxy support."""

    def __init__(self, proxy_url=None):
        self._proxy_url = proxy_url
        self._client = None

    @property
    def read_timeout(self) -> float:
        return 30.0

    @property
    def write_timeout(self) -> float:
        return 30.0

    @property
    def connect_timeout(self) -> float:
        return 30.0

    @property
    def pool_timeout(self) -> float:
        return 30.0

    async def initialize(self):
        self._client = httpx.AsyncClient(
            proxy=self._proxy_url,
            http1=True,
            http2=False,
            headers={'Connection': 'close'},
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=0),
            timeout=httpx.Timeout(connect=30, read=30, write=30, pool=30),
        )

    async def shutdown(self):
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def do_request(
        self,
        url: str,
        method: str,
        request_data=None,
        read_timeout: float | None = None,
        write_timeout: float | None = None,
        connect_timeout: float | None = None,
        pool_timeout: float | None = None,
    ) -> tuple[int, bytes]:
        timeout = httpx.Timeout(
            connect=connect_timeout or 30,
            read=read_timeout or 30,
            write=write_timeout or 30,
            pool=pool_timeout or 30,
        )
        if method == 'POST':
            response = await self._client.post(
                url,
                json=request_data.parameters if request_data else None,
                timeout=timeout,
            )
        else:
            response = await self._client.get(url, timeout=timeout)
        return response.status_code, response.content


NEWS_KEYWORDS = [
    'новый', 'новая', 'новое', 'новые',
    'появился', 'появилась', 'появилось', 'появились',
    'запустил', 'запустила', 'запустили', 'запущен', 'запущена', 'запущено',
    'открыл', 'открыла', 'открыли', 'открыт', 'открыта', 'открыто',
    'проведут', 'состоится', 'состоялось',
    'представил', 'представила', 'представили', 'представлен', 'представлена', 'представлено',
    'анонсировал', 'анонсировала', 'анонсировали', 'анонсирован', 'анонс', 'анонсирована',
    'сообщил', 'сообщила', 'сообщили', 'сообщает', 'сообщают',
    'объявил', 'объявила', 'объявили', 'объявлено', 'объявление',
    'поделился', 'поделилась', 'поделились',
    'отметил', 'отметила', 'отметили',
    'высказал', 'высказала', 'высказали',
    'заявил', 'заявила', 'заявили', 'заявляет', 'заявляют',
    'прокомментировал', 'прокомментировала', 'прокомментировали',
    'предложил', 'предложила', 'предложили',
    'обратил', 'обратила', 'обратили', 'внимание',
    'назначил', 'назначила', 'назначили', 'назначен', 'назначена',
    'подписал', 'подписала', 'подписали', 'подписано',
    'утвердил', 'утвердила', 'утвердили', 'утвержден', 'утверждена',
    'принял', 'приняла', 'приняли', 'принят', 'принята',
    'создал', 'создала', 'создали', 'создан', 'создана',
    'выпустил', 'выпустила', 'выпустили', 'выпущен', 'выпущена',
    'опубликовал', 'опубликовала', 'опубликовали', 'опубликован', 'опубликована',
    'запланирован', 'запланирована',
    'мероприятие', 'конференция', 'форум', 'выставка', 'семинар', 'вебинар', 'сессия',
    'законодательство', 'законодательный', 'закон',
    'отрасль', 'отрасли', 'рынок', 'рынка',
    'винодел', 'винодельня', 'винодельни',
]

NON_NEWS_PHRASES = [
    'привет', 'здравствуй', 'спасибо', 'пожалуйста', 'ок', 'окей', 'давай',
    'как дела', 'до завтра', 'до встречи',
    'договорились', 'понял', 'поняла', 'ясно', 'хорошо', 'отлично', 'буду ждать',
    'напомни', 'напомнишь', 'перешли', 'переслать', 'скинь', 'скинешь',
]


def looks_like_news(text: str) -> bool:
    if not text:
        return False

    text_lower = text.lower()
    if len(text.strip()) < 40:
        return False

    if any(re.search(r'\b' + re.escape(phrase) + r'\b', text_lower) for phrase in NON_NEWS_PHRASES):
        return False

    score = 0
    for keyword in NEWS_KEYWORDS:
        if keyword in text_lower:
            score += 2

    if re.search(r'https?://\S+', text):
        score += 3
    if re.search(r'\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}', text):
        score += 2
    if re.search(r'\d{1,2}:\d{2}', text):
        score += 1
    if '«' in text and '»' in text:
        score += 2
    if re.search(r'\d+(?:[\s\u00A0]?\d{3})*(?:,\d+)?\s*(?:тыс|млн|млрд|руб|₽|%|л\b|кг|т\b)', text_lower):
        score += 2
    if re.search(r'(?:\b[А-ЯЁ][а-яё]+\b).*?[:,]\s*«', text):
        score += 2
    if '?' not in text:
        score += 1

    logger.info('News detection score=%s text=%r', score, text[:80])
    return score >= 3


def make_task_title(text: str) -> str:
    text = text.strip()
    if len(text) > 100:
        text = text[:100].rstrip() + '...'
    return f'Узнать подробнее: {text}'


@sync_to_async
def get_or_create_chat(chat_id, chat_type, title=None):
    chat, _ = TelegramChat.objects.get_or_create(
        chat_id=str(chat_id),
        defaults={
            'chat_type': chat_type,
            'title': title or str(chat_id),
        },
    )
    return chat


@sync_to_async
def save_message(chat, message_id, text, sender_name):
    return TelegramMessage.objects.create(
        chat=chat,
        message_id=str(message_id),
        text=text,
        sender_name=sender_name,
    )


@sync_to_async
def create_task_from_news(message_obj: TelegramMessage, assignee=None):
    title = make_task_title(message_obj.text)
    chat_title = message_obj.chat.title or message_obj.chat.chat_id
    description = f'Источник: {chat_title}\nАвтор: {message_obj.sender_name}\n\n{message_obj.text}'
    task = Task.objects.create(
        title=title,
        description=description,
        source=Task.SOURCE_TELEGRAM,
        status=Task.STATUS_NEW,
    )
    if assignee:
        task.assignees.add(assignee)
    suggestion = NewsSuggestion.objects.create(
        message=message_obj,
        title=title,
        description=message_obj.text,
        status=NewsSuggestion.STATUS_APPROVED,
        created_task=task,
    )
    return task, suggestion


@sync_to_async
def get_journalists():
    return list(User.objects.filter(role=User.ROLE_JOURNALIST).exclude(telegram_id=''))


def pick_random_journalist(journalists):
    if not journalists:
        return None
    return random.choice(journalists)


async def notify_journalists(bot, task, journalists, source_chat_title):
    if not journalists:
        logger.info('Нет журналистов с привязанным Telegram для уведомления')
        return

    assignees = list(task.assignees.all())
    assignee_name = ', '.join(user.get_full_name() for user in assignees) if assignees else 'не назначен'
    text = (
        f'📰 Новая задача из Telegram-источника «{source_chat_title}»\n\n'
        f'#{task.id}: {task.title}\n'
        f'Исполнители: {assignee_name}'
    )
    for journalist in journalists:
        try:
            await bot.send_message(chat_id=journalist.telegram_id, text=text)
        except Exception as exc:
            logger.warning(
                'Не удалось отправить уведомление журналисту %s: %s',
                journalist.telegram_id,
                exc,
            )


def get_sender_name(msg):
    if msg.from_user:
        name = (msg.from_user.full_name or '').strip()
        if name and name.lower() != 'group':
            return name
        if msg.from_user.username:
            return f'@{msg.from_user.username}'
    if msg.sender_chat:
        return getattr(msg.sender_chat, 'title', None) or str(msg.sender_chat.id)
    return ''


async def log_update(update: object, context: ContextTypes.DEFAULT_TYPE):
    if not isinstance(update, Update):
        logger.warning('Получен неожиданный тип update: %r', type(update))
        return
    message = update.effective_message
    chat = update.effective_chat
    logger.info(
        'Получен update: update_id=%s chat_id=%s chat_type=%s text=%r',
        update.update_id,
        getattr(chat, 'id', None),
        getattr(chat, 'type', None),
        getattr(message, 'text', None),
    )


async def on_error(update: object, context: ContextTypes.DEFAULT_TYPE):
    logger.exception(
        'Ошибка обработки update %s: %s',
        getattr(update, 'update_id', None),
        context.error,
    )


async def handle_text_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.effective_message or not update.effective_message.text:
        return

    chat = update.effective_chat
    msg = update.effective_message
    text = msg.text

    chat_obj = await get_or_create_chat(chat.id, chat.type, getattr(chat, 'title', None))
    message_obj = await save_message(chat_obj, msg.message_id, text, get_sender_name(msg))

    if looks_like_news(text):
        journalists = await get_journalists()
        assignee = pick_random_journalist(journalists)
        task, _ = await create_task_from_news(message_obj, assignee=assignee)
        await notify_journalists(context.bot, task, journalists, chat_obj.title or chat_obj.chat_id)


async def task_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.effective_message or not update.effective_message.text:
        return

    title_text = re.sub(r'^/task\s*', '', update.effective_message.text).strip()
    if not title_text:
        await update.effective_message.reply_text('Использование: /task текст задачи')
        return

    chat = update.effective_chat
    msg = update.effective_message
    chat_obj = await get_or_create_chat(chat.id, chat.type, getattr(chat, 'title', None))
    message_obj = await save_message(chat_obj, msg.message_id, title_text, get_sender_name(msg))
    journalists = await get_journalists()
    assignee = pick_random_journalist(journalists)
    task, _ = await create_task_from_news(message_obj, assignee=assignee)
    await notify_journalists(context.bot, task, journalists, chat_obj.title or chat_obj.chat_id)
    await update.effective_message.reply_text(f'✅ Создана задача #{task.id}: {task.title}')


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_message:
        text = await sync_to_async(build_menu_caption)(PLATFORM_TELEGRAM, str(update.effective_user.id))
        await send_menu_message(update.effective_message, text)


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_message:
        await send_menu_message(update.effective_message, build_help_text(PLATFORM_TELEGRAM))


async def link_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.effective_message:
        return

    if not context.args:
        await send_menu_message(update.effective_message, build_link_help_text(PLATFORM_TELEGRAM))
        return

    _, message = await sync_to_async(link_platform_account)(
        PLATFORM_TELEGRAM,
        context.args[0],
        str(update.effective_user.id),
    )
    await sync_to_async(clear_pending_action)(PLATFORM_TELEGRAM, str(update.effective_chat.id))
    await send_menu_message(update.effective_message, message)


async def handle_callback_query(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not query:
        return

    await query.answer()
    action = (query.data or '').replace('crm:', '', 1)
    text = await sync_to_async(handle_menu_action)(
        PLATFORM_TELEGRAM,
        action,
        str(update.effective_user.id),
        str(update.effective_chat.id),
    )
    await query.message.reply_text(text, reply_markup=build_main_menu_markup())


async def handle_private_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.effective_message or not update.effective_message.text:
        return

    text = update.effective_message.text.strip()
    if text.startswith('/'):
        return

    chat = update.effective_chat
    msg = update.effective_message
    sender_name = get_sender_name(msg)
    sender_contact = (
        f'@{msg.from_user.username}'
        if msg.from_user and msg.from_user.username
        else f'ID: {chat.id}'
    )

    chat_obj = await get_or_create_chat(chat.id, chat.type, sender_name or str(chat.id))
    await save_message(chat_obj, msg.message_id, text, sender_name)

    pending_action = await sync_to_async(get_pending_action)(PLATFORM_TELEGRAM, str(chat.id))

    if pending_action == ACTION_LINK:
        _, reply_text = await sync_to_async(link_platform_account)(
            PLATFORM_TELEGRAM,
            text,
            str(update.effective_user.id),
        )
        await sync_to_async(clear_pending_action)(PLATFORM_TELEGRAM, str(chat.id))
        await send_menu_message(msg, reply_text)
        return

    if pending_action == ACTION_CREATE_TASK:
        _, reply_text = await sync_to_async(create_task_from_private_message)(
            PLATFORM_TELEGRAM,
            str(update.effective_user.id),
            text,
            sender_name,
        )
        await sync_to_async(clear_pending_action)(PLATFORM_TELEGRAM, str(chat.id))
        await send_menu_message(msg, reply_text)
        return

    if pending_action == ACTION_CREATE_TICKET:
        _, reply_text = await sync_to_async(create_helpdesk_ticket_from_private_message)(
            PLATFORM_TELEGRAM,
            text,
            sender_name,
            sender_contact,
        )
        await sync_to_async(clear_pending_action)(PLATFORM_TELEGRAM, str(chat.id))
        await send_menu_message(msg, reply_text)
        return

    _, reply_text = await sync_to_async(create_helpdesk_ticket_from_private_message)(
        PLATFORM_TELEGRAM,
        text,
        sender_name,
        sender_contact,
    )
    await send_menu_message(msg, reply_text)


_application = None


def get_application():
    global _application
    if _application is None:
        _application = build_application()
    return _application


def build_httpx_request(proxy_url=None) -> HTTPXRequest:
    return HTTPXRequest(
        proxy=proxy_url,
        http_version='1.1',
        read_timeout=30,
        write_timeout=30,
        connect_timeout=30,
        pool_timeout=30,
        httpx_kwargs={
            'headers': {'Connection': 'close'},
            'limits': httpx.Limits(max_connections=20, max_keepalive_connections=0),
        },
    )


def build_polling_client(proxy_url=None) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        proxy=proxy_url,
        http1=True,
        http2=False,
        headers={'Connection': 'close'},
        limits=httpx.Limits(max_connections=20, max_keepalive_connections=0),
        timeout=httpx.Timeout(connect=30, read=30, write=30, pool=30),
    )


def build_application():
    if not settings.TELEGRAM_BOT_TOKEN:
        raise ValueError('TELEGRAM_BOT_TOKEN не настроен')

    proxy_url = getattr(settings, 'TELEGRAM_PROXY_URL', None)
    request = build_httpx_request(proxy_url=proxy_url)
    get_updates_request = build_httpx_request(proxy_url=proxy_url)
    if proxy_url:
        logger.info('Используется прокси: %s', proxy_url)

    application = (
        ApplicationBuilder()
        .token(settings.TELEGRAM_BOT_TOKEN)
        .updater(None)
        .request(request)
        .get_updates_request(get_updates_request)
        .build()
    )

    application.add_handler(MessageHandler(filters.ALL, log_update), group=-1)
    application.add_handler(CommandHandler('start', start_command))
    application.add_handler(CommandHandler('help', help_command))
    application.add_handler(CommandHandler('task', task_command))
    application.add_handler(CommandHandler('link', link_command))
    application.add_handler(CallbackQueryHandler(handle_callback_query, pattern=r'^crm:'))
    application.add_handler(MessageHandler(filters.ChatType.PRIVATE & filters.TEXT & ~filters.COMMAND, handle_private_message))
    application.add_handler(MessageHandler(filters.ChatType.GROUPS & filters.TEXT & ~filters.COMMAND, handle_text_message))
    application.add_handler(MessageHandler(filters.ChatType.SUPERGROUP & filters.TEXT & ~filters.COMMAND, handle_text_message))
    application.add_error_handler(on_error)

    return application


async def run_bot_once():
    proxy_url = getattr(settings, 'TELEGRAM_PROXY_URL', None)
    token = settings.TELEGRAM_BOT_TOKEN
    application = get_application()
    offset = None

    await application.initialize()
    await application.start()

    try:
        async with build_polling_client(proxy_url=proxy_url) as client:
            while True:
                response = await client.get(
                    f'https://api.telegram.org/bot{token}/getUpdates',
                    params={'timeout': 10, 'offset': offset},
                )
                response.raise_for_status()
                payload = response.json()
                if not payload.get('ok'):
                    raise NetworkError(f'Bot API getUpdates failed: {payload}')

                for item in payload.get('result', []):
                    update = Update.de_json(item, application.bot)
                    offset = update.update_id + 1
                    await application.process_update(update)
    finally:
        try:
            await application.stop()
        finally:
            await application.shutdown()


def run_bot():
    global _application
    logger.info('Запуск Telegram-бота...')
    while True:
        try:
            _application = None
            asyncio.run(run_bot_once())
        except (NetworkError, httpx.ConnectError, httpx.ConnectTimeout, httpx.TimeoutException) as exc:
            logger.error('Ошибка сети Telegram-бота: %s. Повтор через 30 секунд...', exc)
        except Exception as exc:
            logger.exception('Неожиданная ошибка Telegram-бота: %s', exc)

        try:
            import time

            time.sleep(30)
        except KeyboardInterrupt:
            logger.info('Остановка Telegram-бота')
            break
