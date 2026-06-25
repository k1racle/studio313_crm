import logging
import random
import re
from asgiref.sync import sync_to_async
from telegram import Update
from telegram.ext import (
    ApplicationBuilder, ContextTypes, MessageHandler,
    CommandHandler, filters
)
from telegram.request import BaseRequest
import httpx
from django.conf import settings
from apps.tasks.models import Task
from apps.helpdesk.models import HelpdeskTicket
from apps.users.models import User
from .models import TelegramChat, TelegramMessage, NewsSuggestion, TelegramLinkCode

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)
logging.getLogger('telegram').setLevel(logging.DEBUG)
logging.getLogger('httpx').setLevel(logging.DEBUG)

class CustomHTTPXRequest(BaseRequest):
    """Кастомная обёртка над httpx.AsyncClient с поддержкой SOCKS5/HTTP прокси.

    python-telegram-bot использует HTTPXRequest, который при работе через
    некоторые SOCKS5-прокси падает с ConnectTimeout на long-polling запросах.
    Эта реализация использует httpx.AsyncClient напрямую и работает стабильно.
    """

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
    ) -> tuple[int, str]:
        timeout = httpx.Timeout(
            connect=connect_timeout or 30,
            read=read_timeout or 30,
            write=write_timeout or 30,
            pool=pool_timeout or 30,
        )
        if method == 'POST':
            r = await self._client.post(
                url,
                json=request_data.parameters if request_data else None,
                timeout=timeout,
            )
        else:
            r = await self._client.get(url, timeout=timeout)
        return r.status_code, r.content


NEWS_KEYWORDS = [
    'новый', 'новая', 'новое', 'новые',
    'появился', 'появилась', 'появилось', 'появились',
    'запустил', 'запустила', 'запустили', 'запущен', 'запущена', 'запущено',
    'открыл', 'открыла', 'открыли', 'открыт', 'открыта', 'открыто',
    'проведут', 'проведут', 'состоится', 'состоялось',
    'представил', 'представила', 'представили', 'представлен', 'представлена', 'представлено',
    'анонсировал', 'анонсировала', 'анонсировали', 'анонсирован', 'анонс', 'анонсирована',
    'сообщил', 'сообщила', 'сообщили', 'сообщает', 'сообщают',
    'объявил', 'объявила', 'объявили', 'объявлено', 'объявление',
    'поделился', 'поделилась', 'поделились',
    'отметил', 'отметила', 'отметили',
    'высказал', 'высказала', 'высказали',
    'прокомментировал', 'прокомментировала', 'прокомментировали',
    'назначил', 'назначила', 'назначили', 'назначен', 'назначена',
    'подписал', 'подписала', 'подписали', 'подписано',
    'утвердил', 'утвердила', 'утвердили', 'утвержден', 'утверждена',
    'принял', 'приняла', 'приняли', 'принят', 'принята',
    'создал', 'создала', 'создали', 'создан', 'создана',
    'выпустил', 'выпустила', 'выпустили', 'выпущен', 'выпущена',
    'опубликовал', 'опубликовала', 'опубликовали', 'опубликован', 'опубликована',
    'запланирован', 'запланирована',
    'мероприятие', 'конференция', 'форум', 'выставка', 'семинар', 'вебинар',
    'законодательство', 'законодательный', 'закон',
    'винодел', 'винодельня', 'винодельни',
]

# Слова/фразы, которые обычно говорят о личной переписке, а не о новости
NON_NEWS_PHRASES = [
    'привет', 'здравствуй', 'спасибо', 'пожалуйста', 'ок', 'окей', 'давай',
    'когда', 'где', 'сколько', 'почему', 'как дела', 'до завтра', 'до встречи',
    'договорились', 'понял', 'поняла', 'ясно', 'хорошо', 'отлично', 'буду ждать',
    'напомни', 'напомнишь', 'перешли', 'переслать', 'скинь', 'скинешь',
]


def looks_like_news(text: str) -> bool:
    """Определяет, похоже ли сообщение на новость по набору признаков."""
    if not text:
        return False

    text_lower = text.lower()

    # Слишком короткие сообщения — не новости
    if len(text.strip()) < 40:
        return False

    # Явно не новость (приветствия, бытовая переписка)
    if any(phrase in text_lower for phrase in NON_NEWS_PHRASES):
        return False

    score = 0

    # Новостные маркеры
    for keyword in NEWS_KEYWORDS:
        if keyword in text_lower:
            score += 2

    # Наличие ссылки — сильный признак новости
    if re.search(r'https?://\S+', text):
        score += 3

    # Наличие даты/времени
    if re.search(r'\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}', text):
        score += 2
    if re.search(r'\d{1,2}:\d{2}', text):
        score += 1

    # Большой абзац без вопросительных знаков — вероятнее новость
    if '?' not in text:
        score += 1

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
        }
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
    description = (
        f'Источник: {chat_title}\n'
        f'Автор: {message_obj.sender_name}\n\n'
        f'{message_obj.text}'
    )
    task = Task.objects.create(
        title=title,
        description=description,
        source=Task.SOURCE_TELEGRAM,
        status=Task.STATUS_NEW,
        assignee=assignee,
    )
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
    assignee_name = task.assignee.get_full_name() if task.assignee else 'не назначен'
    text = (
        f'📰 Новая задача из Telegram-источника «{source_chat_title}»\n\n'
        f'#{task.id}: {task.title}\n'
        f'Исполнитель: {assignee_name}'
    )
    for journalist in journalists:
        try:
            await bot.send_message(chat_id=journalist.telegram_id, text=text)
        except Exception as e:
            logger.warning('Не удалось отправить уведомление журналисту %s: %s', journalist.telegram_id, e)


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
        task, suggestion = await create_task_from_news(message_obj, assignee=assignee)
        await notify_journalists(context.bot, task, journalists, chat_obj.title or chat_obj.chat_id)


async def task_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.effective_message or not update.effective_message.text:
        return

    text = update.effective_message.text
    # Remove command itself
    title_text = re.sub(r'^/task\s*', '', text).strip()
    if not title_text:
        return

    chat = update.effective_chat
    msg = update.effective_message

    chat_obj = await get_or_create_chat(chat.id, chat.type, getattr(chat, 'title', None))
    message_obj = await save_message(chat_obj, msg.message_id, title_text, get_sender_name(msg))
    journalists = await get_journalists()
    assignee = pick_random_journalist(journalists)
    task, suggestion = await create_task_from_news(message_obj, assignee=assignee)
    await notify_journalists(context.bot, task, journalists, chat_obj.title or chat_obj.chat_id)


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.effective_message.reply_text(
        'Я бот медиа-студии.\n'
        'В групповом чате я автоматически создаю задачи из сообщений, похожих на новости, '
        'и уведомляю журналистов в личных сообщениях.\n'
        'Команды:\n'
        '/task <текст> — создать задачу вручную\n'
        '/link <код> — привязать Telegram-аккаунт к профилю в системе\n'
        '/help — помощь'
    )


@sync_to_async
def link_telegram_account(code, telegram_id):
    try:
        link_code = TelegramLinkCode.objects.get(code=code)
    except TelegramLinkCode.DoesNotExist:
        return None, 'Неверный код. Получите новый код в профиле приложения.'
    if link_code.is_expired():
        return None, 'Код истёк. Создайте новый.'
    user = link_code.user
    user.telegram_id = telegram_id
    user.save()
    link_code.delete()
    return user, f'Аккаунт {user.get_full_name() or user.username} успешно привязан. Вы будете получать уведомления.'


async def link_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.effective_message.reply_text('Использование: /link <код>')
        return
    code = context.args[0]
    telegram_id = str(update.effective_user.id)
    user, message = await link_telegram_account(code, telegram_id)
    await update.effective_message.reply_text(message)


async def handle_private_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.effective_message or not update.effective_message.text:
        return

    text = update.effective_message.text

    if text.startswith('/'):
        return

    chat = update.effective_chat
    msg = update.effective_message

    sender_name = get_sender_name(msg)
    chat_obj = await get_or_create_chat(chat.id, chat.type, sender_name or str(chat.id))
    await save_message(chat_obj, msg.message_id, text, sender_name)

    ticket = await sync_to_async(HelpdeskTicket.objects.create)(
        subject=text[:100],
        description=text,
        source=HelpdeskTicket.SOURCE_TELEGRAM,
        requester_name=sender_name,
        requester_contact=f'@{msg.from_user.username}' if msg.from_user and msg.from_user.username else f'ID: {chat.id}',
    )

    await msg.reply_text(
        f'📩 Ваше обращение зарегистрировано. Номер тикета: #{ticket.id}\n'
        f'Мы скоро свяжемся с вами.'
    )


_application = None


def get_application():
    global _application
    if _application is None:
        _application = build_application()
    return _application


def build_application():
    if not settings.TELEGRAM_BOT_TOKEN:
        raise ValueError('TELEGRAM_BOT_TOKEN не настроен')

    proxy_url = getattr(settings, 'TELEGRAM_PROXY_URL', None)
    request = CustomHTTPXRequest(proxy_url=proxy_url)
    if proxy_url:
        logger.info('Используется прокси: %s', proxy_url)

    application = (
        ApplicationBuilder()
        .token(settings.TELEGRAM_BOT_TOKEN)
        .request(request)
        .get_updates_request(request)
        .build()
    )

    application.add_handler(CommandHandler('start', help_command))
    application.add_handler(CommandHandler('help', help_command))
    application.add_handler(CommandHandler('task', task_command))
    application.add_handler(CommandHandler('link', link_command))
    application.add_handler(MessageHandler(filters.ChatType.PRIVATE & filters.TEXT & ~filters.COMMAND, handle_private_message))
    application.add_handler(MessageHandler(filters.ChatType.GROUPS & filters.TEXT & ~filters.COMMAND, handle_text_message))
    application.add_handler(MessageHandler(filters.ChatType.SUPERGROUP & filters.TEXT & ~filters.COMMAND, handle_text_message))

    return application


def run_bot():
    application = get_application()
    logger.info('Запуск Telegram-бота...')
    application.run_polling(timeout=10, poll_interval=1)
