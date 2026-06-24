import logging
import json
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
from apps.max_bot.bot import MaxBotClient, handle_update

logger = logging.getLogger(__name__)


class MaxWebhookView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        try:
            data = request.data if isinstance(request.data, dict) else json.loads(request.body)
        except Exception as e:
            logger.warning('Невалидный JSON в MAX webhook: %s', e)
            return Response({'ok': False, 'error': 'invalid json'}, status=400)

        token = getattr(settings, 'MAX_BOT_TOKEN', None)
        proxy_url = getattr(settings, 'MAX_PROXY_URL', None)
        client = MaxBotClient(token=token, proxy_url=proxy_url)

        import asyncio
        try:
            asyncio.run(handle_update(client, data))
        except Exception as e:
            logger.exception('Ошибка обработки MAX webhook: %s', e)
        finally:
            asyncio.run(client.close())

        return Response({'ok': True})
