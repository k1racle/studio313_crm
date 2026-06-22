import asyncio
import logging
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.telegram_bot.bot import get_application

logger = logging.getLogger(__name__)


async def _set_webhook():
    webhook_url = getattr(settings, 'TELEGRAM_WEBHOOK_URL', None)
    application = get_application()
    return await application.bot.set_webhook(url=webhook_url)


class Command(BaseCommand):
    help = 'Устанавливает webhook для Telegram-бота'

    def handle(self, *args, **options):
        if not settings.TELEGRAM_BOT_TOKEN:
            self.stderr.write(self.style.ERROR('TELEGRAM_BOT_TOKEN не настроен'))
            return

        webhook_url = getattr(settings, 'TELEGRAM_WEBHOOK_URL', None)
        if not webhook_url:
            self.stderr.write(self.style.ERROR('TELEGRAM_WEBHOOK_URL не настроен'))
            return

        result = asyncio.run(_set_webhook())
        if result:
            self.stdout.write(self.style.SUCCESS(f'Webhook установлен: {webhook_url}'))
        else:
            self.stderr.write(self.style.ERROR('Не удалось установить webhook'))
