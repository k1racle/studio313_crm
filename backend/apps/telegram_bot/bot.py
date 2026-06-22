import logging
import re
from asgiref.sync import sync_to_async
from telegram import Update
from telegram.ext import (
    ApplicationBuilder, ContextTypes, MessageHandler,
    CommandHandler, filters
)
from telegram.request import HTTPXRequest
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

NEWS_KEYWORDS = [
    'новый', 'новая', 'новое', 'новые',
    'появился', 'появилась', 'появилось',
    'запустили', 'открыли', 'проведут', 'состоится',
    'представили', 'анонсировали', 'сообщили',
]


def looks_like_news(text: str) -> bool:
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in NEWS_KEYWORDS)


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
def create_task_from_news(message_obj: TelegramMessage):
    title = make_task_title(message_obj.text)
    task = Task.objects.create(
        title=title,
        description=message_obj.text,
        source=Task.SOURCE_TELEGRAM,
        status=Task.STATUS_NEW,
    )
    suggestion = NewsSuggestion.objects.create(
        message=message_obj,
        title=title,
        description=message_obj.text,
        status=NewsSuggestion.STATUS_APPROVED,
        created_task=task,
    )
    return task, suggestion


async def handle_text_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.effective_message or not update.effective_message.text:
        return

    chat = update.effective_chat
    msg = update.effective_message
    text = msg.text

    chat_obj = await get_or_create_chat(chat.id, chat.type, getattr(chat, 'title', None))
    message_obj = await save_message(chat_obj, msg.message_id, text, msg.from_user.full_name if msg.from_user else '')

    if looks_like_news(text):
        task, suggestion = await create_task_from_news(message_obj)
        await msg.reply_text(
            f'📰 Похоже на новость. Создана задача для журналиста: #{task.id}\n'
            f'«{task.title}»'
        )


async def task_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.effective_message or not update.effective_message.text:
        return

    text = update.effective_message.text
    # Remove command itself
    title_text = re.sub(r'^/task\s*', '', text).strip()
    if not title_text:
        await update.effective_message.reply_text('Использование: /task Текст новости')
        return

    chat = update.effective_chat
    msg = update.effective_message

    chat_obj = await get_or_create_chat(chat.id, chat.type, getattr(chat, 'title', None))
    message_obj = await save_message(chat_obj, msg.message_id, title_text, msg.from_user.full_name if msg.from_user else '')
    task, suggestion = await create_task_from_news(message_obj)

    await update.effective_message.reply_text(
        f'✅ Создана задача #{task.id}: «{task.title}»'
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.effective_message.reply_text(
        'Я бот медиа-студии.\n'
        'В групповом чате я автоматически создаю задачи из сообщений, похожих на новости.\n'
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

    chat_obj = await get_or_create_chat(chat.id, chat.type, msg.from_user.full_name if msg.from_user else str(chat.id))
    await save_message(chat_obj, msg.message_id, text, msg.from_user.full_name if msg.from_user else '')

    ticket = await sync_to_async(HelpdeskTicket.objects.create)(
        subject=text[:100],
        description=text,
        source=HelpdeskTicket.SOURCE_TELEGRAM,
        requester_name=msg.from_user.full_name if msg.from_user else '',
        requester_contact=f'@{msg.from_user.username}' if msg.from_user and msg.from_user.username else f'ID: {chat.id}',
    )

    await msg.reply_text(
        f'📩 Ваше обращение зарегистрировано. Номер тикета: #{ticket.id}\n'
        f'Мы скоро свяжемся с вами.'
    )


def build_application():
    if not settings.TELEGRAM_BOT_TOKEN:
        raise ValueError('TELEGRAM_BOT_TOKEN не настроен')

    request_kwargs = {}
    proxy_url = getattr(settings, 'TELEGRAM_PROXY_URL', None)
    if proxy_url:
        request_kwargs['proxy'] = proxy_url
        logger.info('Используется прокси: %s', proxy_url)

    request = HTTPXRequest(**request_kwargs)
    application = ApplicationBuilder().token(settings.TELEGRAM_BOT_TOKEN).request(request).build()

    application.add_handler(CommandHandler('start', help_command))
    application.add_handler(CommandHandler('help', help_command))
    application.add_handler(CommandHandler('task', task_command))
    application.add_handler(CommandHandler('link', link_command))
    application.add_handler(MessageHandler(filters.ChatType.PRIVATE & filters.TEXT & ~filters.COMMAND, handle_private_message))
    application.add_handler(MessageHandler(filters.ChatType.GROUPS & filters.TEXT & ~filters.COMMAND, handle_text_message))
    application.add_handler(MessageHandler(filters.ChatType.SUPERGROUP & filters.TEXT & ~filters.COMMAND, handle_text_message))

    return application


def run_bot():
    application = build_application()
    logger.info('Запуск Telegram-бота...')
    # Use short polling timeout because the proxy drops long-lived connections
    application.run_polling(timeout=4, poll_interval=1)
