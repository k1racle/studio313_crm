import asyncio
import logging
from celery import shared_task
from django.apps import apps
from .bot import MaxBotClient

logger = logging.getLogger(__name__)


@shared_task
def send_max_message(user_id, text):
    User = apps.get_model('users', 'User')
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
            await client.send_message(chat_id=None, text=text, user_id=user.max_id)
        finally:
            await client.close()

    try:
        asyncio.run(_send())
    except Exception as e:
        logger.exception('Ошибка отправки MAX-уведомления пользователю %s: %s', user, e)
