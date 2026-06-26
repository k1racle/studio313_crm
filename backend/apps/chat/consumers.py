import json
import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from .models import Chat, Message
from .tasks import notify_chat_members

logger = logging.getLogger(__name__)
User = get_user_model()


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        try:
            self.user = await self.get_user_from_token()
            if not self.user:
                logger.warning('[ChatConsumer] rejected: no user from token')
                await self.close(code=4001)
                return
            self.chat_groups = set()
            await self.accept()
            logger.info('[ChatConsumer] user %s accepted', self.user['id'])
            if self.channel_layer is None:
                logger.error('[ChatConsumer] channel_layer is not configured')
                await self.close(code=4002)
                return
            chats = await self.get_user_chat_ids()
            for chat_id in chats:
                group = f'chat_{chat_id}'
                await self.channel_layer.group_add(group, self.channel_name)
                self.chat_groups.add(group)
            logger.info('[ChatConsumer] user %s joined %s groups', self.user['id'], len(self.chat_groups))
        except Exception as e:
            logger.exception('[ChatConsumer] connect error')
            await self.close(code=4000)

    async def disconnect(self, close_code):
        try:
            for group in getattr(self, 'chat_groups', []):
                await self.channel_layer.group_discard(group, self.channel_name)
        except Exception:
            logger.exception('[ChatConsumer] disconnect error')

    async def receive_json(self, content):
        try:
            action = content.get('action')
            chat_id = content.get('chat_id')
            logger.debug('[ChatConsumer] user %s action %s chat %s', self.user['id'], action, chat_id)

            if action == 'message':
                text = content.get('text', '').strip()
                sticker_id = content.get('sticker_id')
                file = content.get('file')
                voice = content.get('voice')
                reply_to_id = content.get('reply_to_id')
                message = await self.create_message(chat_id, text, sticker_id, file, voice, reply_to_id)
                if message:
                    await self.channel_layer.group_send(
                        f'chat_{chat_id}',
                        {'type': 'chat_message', 'message': message}
                    )
                    notify_chat_members.delay(message['id'], self.user['id'])
                else:
                    logger.warning('[ChatConsumer] message not created for chat %s', chat_id)
            elif action == 'read':
                await self.mark_read(chat_id)
                await self.channel_layer.group_send(
                    f'chat_{chat_id}',
                    {'type': 'chat_read', 'chat_id': chat_id, 'user_id': self.user['id']}
                )
            elif action == 'typing':
                await self.channel_layer.group_send(
                    f'chat_{chat_id}',
                    {'type': 'chat_typing', 'chat_id': chat_id, 'user_id': self.user['id'], 'user_name': self.user['name']}
                )
        except Exception:
            logger.exception('[ChatConsumer] receive_json error')

    async def chat_message(self, event):
        await self.send_json({'type': 'message', 'message': event['message']})

    async def chat_message_update(self, event):
        await self.send_json({'type': 'message_update', 'message': event['message']})

    async def chat_read(self, event):
        await self.send_json({'type': 'read', 'chat_id': event['chat_id'], 'user_id': event['user_id']})

    async def chat_typing(self, event):
        await self.send_json({'type': 'typing', 'chat_id': event['chat_id'], 'user_id': event['user_id'], 'user_name': event['user_name']})

    @database_sync_to_async
    def get_user_from_token(self):
        query = self.scope['query_string'].decode()
        token = None
        for part in query.split('&'):
            if part.startswith('token='):
                token = part.split('=', 1)[1]
                break
        if not token:
            return None
        try:
            access = AccessToken(token)
            user = User.objects.get(id=access['user_id'])
            return {'id': user.id, 'name': user.get_short_name()}
        except Exception as e:
            logger.warning('[ChatConsumer] token error: %s', e)
            return None

    @database_sync_to_async
    def get_user_chat_ids(self):
        return list(Chat.objects.filter(members__id=self.user['id']).values_list('id', flat=True))

    @database_sync_to_async
    def create_message(self, chat_id, text, sticker_id=None, file=None, voice=None, reply_to_id=None):
        try:
            chat = Chat.objects.get(pk=chat_id, members__id=self.user['id'])
        except Chat.DoesNotExist:
            logger.warning('[ChatConsumer] chat %s not found for user %s', chat_id, self.user['id'])
            return None
        if not text and not sticker_id and not file and not voice:
            return None
        data = {'chat': chat, 'sender_id': self.user['id'], 'text': text}
        if sticker_id:
            data['sticker_id'] = sticker_id
        if file:
            data['file'] = file
        if voice:
            data['voice'] = voice
        if reply_to_id:
            data['reply_to_id'] = reply_to_id
        try:
            msg = Message.objects.create(**data)
        except Exception as e:
            logger.exception('[ChatConsumer] create_message error')
            return None
        return {
            'id': msg.id,
            'chat': chat.id,
            'text': msg.text,
            'transcription': msg.transcription,
            'sticker': {'id': msg.sticker.id, 'name': msg.sticker.name, 'image': msg.sticker.image.url} if msg.sticker else None,
            'file': msg.file.url if msg.file else None,
            'voice': msg.voice.url if msg.voice else None,
            'sender': {'id': self.user['id'], 'name': self.user['name']},
            'created_at': msg.created_at.isoformat(),
            'reply_to': msg.reply_to_id,
        }

    @database_sync_to_async
    def mark_read(self, chat_id):
        try:
            chat = Chat.objects.get(pk=chat_id, members__id=self.user['id'])
            messages = Message.objects.filter(chat=chat).exclude(sender_id=self.user['id']).exclude(read_by__id=self.user['id'])
            user = User.objects.get(id=self.user['id'])
            for msg in messages:
                if not msg.read_by.filter(id=user.id).exists():
                    msg.read_by.add(user)
        except Chat.DoesNotExist:
            pass
