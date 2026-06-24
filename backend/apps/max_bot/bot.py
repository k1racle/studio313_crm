import logging
import re
import httpx
from asgiref.sync import sync_to_async
from django.conf import settings
from apps.tasks.models import Task
from apps.helpdesk.models import HelpdeskTicket
from apps.users.models import User
from .models import MaxChat, MaxMessage, MaxLinkCode, MaxNewsSuggestion

logger = logging.getLogger(__name__)

MAX_API_BASE = getattr(settings, 'MAX_BOT_API_BASE', 'https://platform-api.max.ru')

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
    'назначил', 'назначила', 'назначили', 'назначен', 'назначена',
    'подписал', 'подписала', 'подписали', 'подписано',
    'утвердил', 'утвердила', 'утвердили', 'утвержден', 'утверждена',
    'принял', 'приняла', 'приняли', 'принят', 'принята',
    'создал', 'создала', 'создали', 'создан', 'создана',
    'выпустил', 'выпустила', 'выпустили', 'выпущен', 'выпущена',
    'опубликовал', 'опубликовала', 'опубликовали', 'опубликован', 'опубликована',
    'запланирован', 'запланирована',
    'мероприятие', 'конференция', 'форум', 'выставка', 'семинар', 'вебинар',
]

NON_NEWS_PHRASES = [
    'привет', 'здравствуй', 'спасибо', 'пожалуйста', 'ок', 'окей', 'давай',
    'когда', 'где', 'сколько', 'почему', 'как дела', 'до завтра', 'до встречи',
    'договорились', 'понял', 'поняла', 'ясно', 'хорошо', 'отлично', 'буду ждать',
    'напомни', 'напомнишь', 'перешли', 'переслать', 'скинь', 'скинешь',
]


def looks_like_news(text: str) -> bool:
    if not text:
        return False

    text_lower = text.lower()

    if len(text.strip()) < 40:
        return False

    if any(phrase in text_lower for phrase in NON_NEWS_PHRASES):
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
    if '?' not in text:
        score += 1

    return score >= 3


def make_task_title(text: str) -> str:
    text = text.strip()
    if len(text) > 100:
        text = text[:100].rstrip() + '...'
    return f'Узнать подробнее: {text}'


class MaxBotClient:
    def __init__(self, token=None, proxy_url=None):
        self.token = token or getattr(settings, 'MAX_BOT_TOKEN', '')
        self.proxy_url = proxy_url or getattr(settings, 'MAX_PROXY_URL', None)
        self.headers = {'Authorization': self.token}
        client_kwargs = {
            'http1': True,
            'http2': False,
            'timeout': httpx.Timeout(connect=30, read=60, write=30, pool=30),
            'headers': self.headers,
        }
        if self.proxy_url:
            client_kwargs['proxy'] = self.proxy_url
        self.client = httpx.AsyncClient(**client_kwargs)

    async def close(self):
        await self.client.aclose()

    async def get_me(self):
        r = await self.client.get(f'{MAX_API_BASE}/me')
        r.raise_for_status()
        return r.json()

    async def send_message(self, chat_id, text, reply_to_message_id=None):
        payload = {'chat_id': chat_id, 'text': text}
        if reply_to_message_id:
            payload['reply_to_message_id'] = reply_to_message_id
        r = await self.client.post(f'{MAX_API_BASE}/messages', json=payload)
        r.raise_for_status()
        return r.json()

    async def get_updates(self, offset=None, limit=100, timeout=30):
        params = {'limit': limit, 'timeout': timeout}
        if offset:
            params['offset'] = offset
        r = await self.client.get(f'{MAX_API_BASE}/updates', params=params)
        r.raise_for_status()
        return r.json()


@sync_to_async
def get_or_create_chat(chat_id, chat_type, title=None):
    chat, _ = MaxChat.objects.get_or_create(
        chat_id=str(chat_id),
        defaults={
            'chat_type': chat_type or 'private',
            'title': title or str(chat_id),
        }
    )
    return chat


@sync_to_async
def save_message(chat, message_id, text, sender_name):
    return MaxMessage.objects.create(
        chat=chat,
        message_id=str(message_id),
        text=text,
        sender_name=sender_name,
    )


@sync_to_async
def create_task_from_news(message_obj: MaxMessage):
    title = make_task_title(message_obj.text)
    task = Task.objects.create(
        title=title,
        description=message_obj.text,
        source=Task.SOURCE_MAX,
        status=Task.STATUS_NEW,
    )
    suggestion = MaxNewsSuggestion.objects.create(
        message=message_obj,
        title=title,
        description=message_obj.text,
        status=MaxNewsSuggestion.STATUS_APPROVED,
        created_task=task,
    )
    return task, suggestion


@sync_to_async
def link_max_account(code, max_user_id):
    try:
        link_code = MaxLinkCode.objects.get(code=code)
    except MaxLinkCode.DoesNotExist:
        return None, 'Неверный код. Получите новый код в профиле приложения.'
    if link_code.is_expired():
        return None, 'Код истёк. Создайте новый.'
    user = link_code.user
    user.telegram_id = str(max_user_id)
    user.save()
    link_code.delete()
    return user, f'Аккаунт {user.get_full_name() or user.username} успешно привязан. Вы будете получать уведомления.'


@sync_to_async
def create_helpdesk_ticket(text, sender_name, sender_username, chat_id):
    return HelpdeskTicket.objects.create(
        subject=text[:100],
        description=text,
        source=HelpdeskTicket.SOURCE_MAX,
        requester_name=sender_name,
        requester_contact=f'@{sender_username}' if sender_username else f'ID: {chat_id}',
    )


def _extract_chat(update):
    """Извлекает chat из update в зависимости от структуры MAX."""
    message = update.get('message') or update.get('payload') or {}
    if not message:
        return None
    chat = message.get('chat') or message.get('recipient') or {}
    return chat


def _extract_sender(update):
    message = update.get('message') or update.get('payload') or {}
    sender = message.get('from') or message.get('sender') or {}
    return sender


def _extract_text(update):
    message = update.get('message') or update.get('payload') or {}
    return message.get('text') or ''


def _extract_message_id(update):
    message = update.get('message') or update.get('payload') or {}
    return message.get('id') or message.get('message_id') or '0'


async def handle_update(client: MaxBotClient, update: dict):
    logger.debug('MAX update: %s', update)

    text = _extract_text(update)
    chat = _extract_chat(update)
    sender = _extract_sender(update)
    message_id = _extract_message_id(update)

    if not chat:
        logger.warning('Не удалось извлечь chat из update: %s', update)
        return

    chat_id = chat.get('id')
    chat_type = chat.get('type', 'private')
    title = chat.get('title') or chat.get('name')
    sender_name = sender.get('first_name') or sender.get('name') or 'Неизвестно'
    sender_username = sender.get('username') or ''
    user_id = sender.get('id')

    chat_obj = await get_or_create_chat(chat_id, chat_type, title)
    message_obj = await save_message(chat_obj, message_id, text, sender_name)

    # Команды
    if text.startswith('/start'):
        await client.send_message(
            chat_id,
            'Я бот медиа-студии.\n'
            'В групповом чате я автоматически создаю задачи из сообщений, похожих на новости.\n'
            'Команды:\n'
            '/task <текст> — создать задачу вручную\n'
            '/link <код> — привязать MAX-аккаунт к профилю в системе\n'
            '/help — помощь'
        )
        return

    if text.startswith('/help'):
        await client.send_message(
            chat_id,
            'Я бот медиа-студии.\n'
            'В групповом чате я автоматически создаю задачи из сообщений, похожих на новости.\n'
            'Команды:\n'
            '/task <текст> — создать задачу вручную\n'
            '/link <код> — привязать MAX-аккаунт к профилю в системе\n'
            '/help — помощь'
        )
        return

    if text.startswith('/task'):
        title_text = re.sub(r'^/task\s*', '', text).strip()
        if not title_text:
            await client.send_message(chat_id, 'Использование: /task Текст новости')
            return
        task, _ = await create_task_from_news(message_obj)
        await client.send_message(
            chat_id,
            f'✅ Создана задача #{task.id}: «{task.title}»'
        )
        return

    if text.startswith('/link'):
        code = text.split(maxsplit=1)[1] if len(text.split()) > 1 else ''
        if not code:
            await client.send_message(chat_id, 'Использование: /link <код>')
            return
        user, message = await link_max_account(code, user_id)
        await client.send_message(chat_id, message)
        return

    # Групповые чаты
    if chat_type in ('group', 'supergroup'):
        if looks_like_news(text):
            task, _ = await create_task_from_news(message_obj)
            await client.send_message(
                chat_id,
                f'📰 Похоже на новость. Создана задача для журналиста: #{task.id}\n'
                f'«{task.title}»',
                reply_to_message_id=message_id
            )
        return

    # Личные сообщения
    if chat_type == 'private':
        if text.startswith('/'):
            return
        ticket = await create_helpdesk_ticket(text, sender_name, sender_username, chat_id)
        await client.send_message(
            chat_id,
            f'📩 Ваше обращение зарегистрировано. Номер тикета: #{ticket.id}\n'
            f'Мы скоро свяжемся с вами.'
        )


async def run_max_bot():
    token = getattr(settings, 'MAX_BOT_TOKEN', None)
    if not token:
        logger.error('MAX_BOT_TOKEN не настроен')
        return

    proxy_url = getattr(settings, 'MAX_PROXY_URL', None)
    client = MaxBotClient(token=token, proxy_url=proxy_url)

    try:
        me = await client.get_me()
        logger.info('MAX бот запущен: %s', me)
    except Exception as e:
        logger.error('Не удалось получить информацию о MAX боте: %s', e)
        await client.close()
        return

    offset = None
    logger.info('Запуск long polling для MAX бота...')

    while True:
        try:
            updates = await client.get_updates(offset=offset, timeout=30)
            results = updates.get('results') or updates.get('updates') or []
            for update in results:
                try:
                    await handle_update(client, update)
                except Exception as e:
                    logger.exception('Ошибка обработки MAX update: %s', e)
                update_id = update.get('update_id') or update.get('id')
                if update_id:
                    offset = update_id + 1
        except Exception as e:
            logger.exception('Ошибка polling MAX: %s', e)
