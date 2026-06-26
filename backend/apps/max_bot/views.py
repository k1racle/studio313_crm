import logging
import json
from datetime import timedelta
from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
from django.utils import timezone
from apps.max_bot.bot import MaxBotClient, handle_update
from .models import MaxLinkCode

logger = logging.getLogger(__name__)


class MaxLinkCodeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        now = timezone.now()
        link_code, _ = MaxLinkCode.objects.update_or_create(
            user=request.user,
            defaults={'code': '', 'created_at': now}
        )
        link_code.save()
        return Response({
            'code': link_code.code,
            'expires_at': link_code.created_at + timedelta(hours=1)
        })


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
