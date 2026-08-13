import json
import logging
import re

import httpx
from asgiref.sync import sync_to_async
from config import socks5_ipv4_patch  # noqa: F401
from django.conf import settings

from apps.bot_assistant import (
    ACTION_CREATE_TASK,
    ACTION_CREATE_TICKET,
    ACTION_LINK,
    ACTION_MENU,
    MAIN_MENU_ROWS,
    PLATFORM_MAX,
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
from .models import MaxChat, MaxMessage, MaxNewsSuggestion

logger = logging.getLogger(__name__)

MAX_API_BASE = getattr(settings, 'MAX_BOT_API_BASE', 'https://platform-api2.max.ru')

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
    'обратил внимание', 'обратила внимание', 'обратили внимание',
    'озвучил', 'озвучила', 'озвучили',
    'заявил', 'заявила', 'заявили',
    'предложил', 'предложила', 'предложили',
    'выступил', 'выступила', 'выступили',
    'рассказал', 'рассказала', 'рассказали',
    'законодательство', 'законодательный', 'закон',
    'термин', 'поддержка', 'развитие', 'направление', 'в ходе', 'по итогам', 'по словам',
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


def build_main_menu_attachments():
    buttons = [
        [{'type': 'callback', 'text': text, 'payload': f'crm:{action}'} for text, action in row]
        for row in MAIN_MENU_ROWS
    ]
    buttons.append([{'type': 'callback', 'text': '♻️ Обновить меню', 'payload': f'crm:{ACTION_MENU}'}])
    buttons.append([{'type': 'callback', 'text': '🔗 Подключить CRM', 'payload': 'crm:link'}])
    return [
        {
            'type': 'inline_keyboard',
            'payload': {
                'buttons': buttons,
            },
        }
    ]


def build_menu_message(text: str) -> dict:
    return {
        'text': text,
        'attachments': build_main_menu_attachments(),
    }


class MaxBotClient:
    def __init__(self, token=None, proxy_url=None):
        self.token = token or getattr(settings, 'MAX_BOT_TOKEN', '')
        self.proxy_url = proxy_url or getattr(settings, 'MAX_PROXY_URL', '')
        self.ssl_verify = getattr(settings, 'MAX_SSL_VERIFY', True)
        self.ca_cert_path = getattr(settings, 'MAX_CA_CERT_PATH', '')
        self.headers = {'Authorization': self.token}
        logger.info(
            'MaxBotClient init: api_base=%s token_set=%s proxy=%s ssl_verify=%s ca_cert=%s',
            MAX_API_BASE,
            bool(self.token),
            bool(self.proxy_url),
            self.ssl_verify,
            bool(self.ca_cert_path),
        )
        verify = self.ca_cert_path or self.ssl_verify
        client_kwargs = {
            'http1': True,
            'http2': False,
            'timeout': httpx.Timeout(connect=30, read=60, write=30, pool=30),
            'headers': self.headers,
            'verify': verify,
        }
        if self.proxy_url:
            client_kwargs['proxy'] = self.proxy_url
        self.client = httpx.AsyncClient(**client_kwargs)

    async def close(self):
        await self.client.aclose()

    async def get_me(self):
        try:
            response = await self.client.get(f'{MAX_API_BASE}/me')
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            if hasattr(exc, 'response') and exc.response is not None:
                logger.error('MAX get_me response: %s %s', exc.response.status_code, exc.response.text)
            raise

    async def send_message(
        self,
        chat_id,
        text,
        reply_to_message_id=None,
        user_id=None,
        attachments=None,
        text_format=None,
        notify=True,
    ):
        params = {}
        if user_id:
            params['user_id'] = user_id
        elif chat_id:
            params['chat_id'] = chat_id
        else:
            raise ValueError('Не указан chat_id или user_id')

        payload = {'text': text, 'notify': notify}
        if reply_to_message_id:
            payload['link'] = {'type': 'reply', 'mid': reply_to_message_id}
        if attachments is not None:
            payload['attachments'] = attachments
        if text_format:
            payload['format'] = text_format

        try:
            response = await self.client.post(f'{MAX_API_BASE}/messages', params=params, json=payload)
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            if hasattr(exc, 'response') and exc.response is not None:
                logger.error('MAX send_message response: %s %s', exc.response.status_code, exc.response.text)
            raise

    async def answer_callback(self, callback_id, message=None):
        payload = {}
        if message is not None:
            payload['message'] = message
        try:
            response = await self.client.post(f'{MAX_API_BASE}/answers', params={'callback_id': callback_id}, json=payload)
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            if hasattr(exc, 'response') and exc.response is not None:
                logger.error('MAX answer_callback response: %s %s', exc.response.status_code, exc.response.text)
            raise

    async def get_updates(self, marker=None, limit=100, timeout=30, types=None):
        params = {'limit': limit, 'timeout': timeout}
        if marker is not None:
            params['marker'] = marker
        if types:
            params['types'] = ','.join(types) if isinstance(types, (list, tuple, set)) else types
        try:
            response = await self.client.get(f'{MAX_API_BASE}/updates', params=params)
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            if hasattr(exc, 'response') and exc.response is not None:
                logger.error('MAX get_updates response: %s %s', exc.response.status_code, exc.response.text)
            raise


@sync_to_async
def get_or_create_chat(chat_id, chat_type, title=None):
    chat, _ = MaxChat.objects.get_or_create(
        chat_id=str(chat_id),
        defaults={
            'chat_type': chat_type or 'private',
            'title': title or str(chat_id),
        },
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
    chat_title = message_obj.chat.title or message_obj.chat.chat_id
    description = f'Источник: {chat_title}\nАвтор: {message_obj.sender_name}\n\n{message_obj.text}'
    task = Task.objects.create(
        title=title,
        description=description,
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


def _extract_message(update):
    return update.get('message') or update.get('payload') or update.get('data') or {}


def _extract_chat(update):
    if 'chat_id' in update:
        return {
            'chat_id': update['chat_id'],
            'chat_type': update.get('chat_type', 'dialog'),
        }

    message = _extract_message(update)
    if not message:
        return None

    chat = message.get('recipient') or message.get('chat') or message.get('peer') or {}
    if not chat and 'chat_id' in message:
        return {'chat_id': message['chat_id']}
    return chat


def _extract_sender(update):
    if 'user' in update:
        return update['user']
    message = _extract_message(update)
    return message.get('sender') or message.get('from') or message.get('user') or {}


def _extract_text(update):
    message = _extract_message(update)
    body = message.get('body') or {}
    if isinstance(body, dict) and body.get('text'):
        return body.get('text')
    if message.get('text'):
        return message.get('text')
    content = message.get('content') or {}
    if isinstance(content, dict):
        return content.get('text') or ''
    return ''


def _extract_message_id(update):
    message = _extract_message(update)
    body = message.get('body') or {}
    if isinstance(body, dict):
        return body.get('mid') or body.get('id') or body.get('message_id') or '0'
    return message.get('id') or message.get('message_id') or message.get('msg_id') or '0'


def _extract_callback(update):
    return update.get('callback') or update.get('message_callback') or {}


async def _send_menu(client: MaxBotClient, chat_id, user_id, text: str):
    return await client.send_message(
        chat_id=chat_id,
        user_id=user_id,
        text=text,
        attachments=build_main_menu_attachments(),
    )


async def _answer_with_menu(client: MaxBotClient, callback_id, text: str):
    return await client.answer_callback(callback_id, message=build_menu_message(text))


async def handle_update(client: MaxBotClient, update: dict):
    logger.info('MAX update raw: %s', json.dumps(update, ensure_ascii=False))

    update_type = update.get('update_type', '')
    callback = _extract_callback(update)
    callback_id = callback.get('callback_id')
    callback_payload = callback.get('payload') or callback.get('data') or ''

    text = _extract_text(update)
    chat = _extract_chat(update)
    sender = _extract_sender(update)
    message_id = _extract_message_id(update)

    chat_id = chat.get('chat_id') or chat.get('id') if chat else None
    chat_type_raw = chat.get('chat_type') or chat.get('type', 'private') if chat else 'private'
    chat_type = 'private' if chat_type_raw == 'dialog' else chat_type_raw
    title = chat.get('title') or chat.get('name') if chat else None
    sender_name = sender.get('first_name') or sender.get('name') or 'Неизвестно'
    sender_username = sender.get('username') or ''
    user_id = sender.get('user_id') or sender.get('id')

    logger.info(
        'MAX parsed: type=%s chat_id=%s chat_type=%s message_id=%r text=%r sender=%s user_id=%s callback=%r',
        update_type,
        chat_id,
        chat_type,
        message_id,
        text,
        sender_name,
        user_id,
        callback_payload,
    )

    if not chat_id:
        logger.warning('Не удалось извлечь chat_id из update: %s', update)
        return

    chat_obj = await get_or_create_chat(chat_id, chat_type, title)
    message_obj = None
    if text:
        message_obj = await save_message(chat_obj, message_id, text, sender_name)

    if update_type == 'message_callback' and callback_payload:
        action = str(callback_payload).replace('crm:', '', 1)
        reply_text = await sync_to_async(handle_menu_action)(
            PLATFORM_MAX,
            action,
            str(user_id),
            str(chat_id),
        )
        if callback_id:
            await _answer_with_menu(client, callback_id, reply_text)
        else:
            await _send_menu(client, chat_id, user_id, reply_text)
        return

    if update_type in ('bot_started', 'bot_added') or text.startswith('/start') or text.startswith('/hello'):
        reply_text = await sync_to_async(build_menu_caption)(PLATFORM_MAX, str(user_id), str(chat_id))
        await _send_menu(client, chat_id, user_id, reply_text)
        return

    if text.startswith('/help'):
        await _send_menu(client, chat_id, user_id, build_help_text(PLATFORM_MAX))
        return

    if text.startswith('/link'):
        parts = text.split(maxsplit=1)
        if len(parts) < 2:
            await _send_menu(client, chat_id, user_id, build_link_help_text(PLATFORM_MAX))
            return
        _, reply_text = await sync_to_async(link_platform_account)(
            PLATFORM_MAX,
            parts[1],
            str(user_id),
            str(chat_id),
        )
        await sync_to_async(clear_pending_action)(PLATFORM_MAX, str(chat_id))
        await _send_menu(client, chat_id, user_id, reply_text)
        return

    if text.startswith('/task'):
        title_text = re.sub(r'^/task\s*', '', text).strip()
        if not title_text:
            await _send_menu(client, chat_id, user_id, 'Использование: /task текст задачи')
            return
        _, reply_text = await sync_to_async(create_task_from_private_message)(
            PLATFORM_MAX,
            str(user_id),
            title_text,
            sender_name,
            str(chat_id),
        )
        await _send_menu(client, chat_id, user_id, reply_text)
        return

    if chat_type not in ('private', 'dialog'):
        if text and looks_like_news(text):
            task, _ = await create_task_from_news(message_obj)
            logger.info('MAX: создана задача #%s из новости в чате %s', task.id, chat_id)
        return

    pending_action = await sync_to_async(get_pending_action)(PLATFORM_MAX, str(chat_id))

    if pending_action == ACTION_LINK:
        _, reply_text = await sync_to_async(link_platform_account)(
            PLATFORM_MAX,
            text,
            str(user_id),
            str(chat_id),
        )
        await sync_to_async(clear_pending_action)(PLATFORM_MAX, str(chat_id))
        await _send_menu(client, chat_id, user_id, reply_text)
        return

    if pending_action == ACTION_CREATE_TASK:
        _, reply_text = await sync_to_async(create_task_from_private_message)(
            PLATFORM_MAX,
            str(user_id),
            text,
            sender_name,
            str(chat_id),
        )
        await sync_to_async(clear_pending_action)(PLATFORM_MAX, str(chat_id))
        await _send_menu(client, chat_id, user_id, reply_text)
        return

    if pending_action == ACTION_CREATE_TICKET:
        _, reply_text = await sync_to_async(create_helpdesk_ticket_from_private_message)(
            PLATFORM_MAX,
            text,
            sender_name,
            f'@{sender_username}' if sender_username else f'ID: {chat_id}',
        )
        await sync_to_async(clear_pending_action)(PLATFORM_MAX, str(chat_id))
        await _send_menu(client, chat_id, user_id, reply_text)
        return

    if text:
        _, reply_text = await sync_to_async(create_helpdesk_ticket_from_private_message)(
            PLATFORM_MAX,
            text,
            sender_name,
            f'@{sender_username}' if sender_username else f'ID: {chat_id}',
        )
        await _send_menu(client, chat_id, user_id, reply_text)


async def run_max_bot():
    import asyncio

    token = getattr(settings, 'MAX_BOT_TOKEN', None)
    if not token:
        logger.error('MAX_BOT_TOKEN не настроен')
        return

    while True:
        client = MaxBotClient(token=token)
        try:
            me = await client.get_me()
            logger.info('MAX бот запущен: %s', me)
            break
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.NetworkError) as exc:
            logger.error('Не удалось подключиться к MAX API: %s. Повтор через 30 секунд...', exc)
            await client.close()
            await asyncio.sleep(30)
        except Exception:
            logger.exception('Не удалось получить информацию о MAX-боте')
            await client.close()
            await asyncio.sleep(30)

    marker = None
    logger.info('Запуск long polling для MAX-бота...')

    while True:
        try:
            updates = await client.get_updates(
                marker=marker,
                timeout=30,
                types=['bot_started', 'bot_added', 'message_created', 'message_callback'],
            )
            results = updates.get('updates') or updates.get('results') or []
            for update in results:
                try:
                    await handle_update(client, update)
                except Exception as exc:
                    logger.exception('Ошибка обработки MAX update: %s', exc)
            if 'marker' in updates:
                marker = updates.get('marker')
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.NetworkError) as exc:
            logger.error('Ошибка long polling MAX: %s. Повтор через 30 секунд...', exc)
            await asyncio.sleep(30)
        except Exception as exc:
            logger.exception('Неожиданная ошибка MAX-бота: %s', exc)
            await asyncio.sleep(30)
