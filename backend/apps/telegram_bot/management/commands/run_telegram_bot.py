from django.core.management.base import BaseCommand
from django.conf import settings
from apps.telegram_bot.bot import run_bot


class Command(BaseCommand):
    help = 'Запускает Telegram-бота'

    def handle(self, *args, **options):
        if not settings.TELEGRAM_BOT_TOKEN or settings.TELEGRAM_BOT_TOKEN == 'your-telegram-bot-token':
            self.stderr.write(self.style.ERROR(
                'TELEGRAM_BOT_TOKEN не настроен. Укажите реальный токен бота в переменных окружения.'
            ))
            return
        run_bot()
