import asyncio
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.max_bot.bot import run_max_bot


class Command(BaseCommand):
    help = 'Запускает MAX-бота'

    def handle(self, *args, **options):
        if not settings.MAX_BOT_TOKEN or settings.MAX_BOT_TOKEN == 'your-max-bot-token':
            self.stderr.write(self.style.ERROR('MAX_BOT_TOKEN не настроен.'))
            return
        asyncio.run(run_max_bot())
