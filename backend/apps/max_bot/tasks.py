import asyncio
import logging
from celery import shared_task
from django.conf import settings
from apps.users.models import User
from .bot import MaxBotClient

logger = logging.getLogger(__name__)


@shared_task
def send_max_message(user_id, text):
    if not settings.MAX_BOT_TOKEN:
        logger.warning('MAX_BOT_TOKEN не настроен — уведомление не отправлено')
        return

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.warning('Пользователь %s не найден для MAX-уведомления', user_id)
        return

    if not user.max_id:
        logger.warning('У пользователя %s не привязан MAX', user)
        return

    async def _send():
        client = MaxBotClient()
        try:
            result = await client.send_message(chat_id=None, text=text, user_id=user.max_id)
            logger.info('MAX-уведомление отправлено пользователю %s (max_id=%s): %s', user, user.max_id, result)
        finally:
            await client.close()

    try:
        asyncio.run(_send())
    except Exception as e:
        logger.exception('Ошибка отправки MAX-уведомления пользователю %s: %s', user, e)
