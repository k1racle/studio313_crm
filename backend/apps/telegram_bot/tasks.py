import asyncio
import logging
from celery import shared_task
from telegram import Bot
from telegram.request import HTTPXRequest
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task
def send_telegram_message(chat_id, text):
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.warning('TELEGRAM_BOT_TOKEN не настроен, уведомление не отправлено')
        return

    async def _send():
        request = None
        if settings.TELEGRAM_PROXY_URL:
            request = HTTPXRequest(proxy_url=settings.TELEGRAM_PROXY_URL)
        bot = Bot(token=settings.TELEGRAM_BOT_TOKEN, request=request)
        await bot.send_message(chat_id=chat_id, text=text)

    try:
        asyncio.run(_send())
    except Exception as e:
        logger.error(f'Ошибка отправки сообщения в Telegram: {e}')
