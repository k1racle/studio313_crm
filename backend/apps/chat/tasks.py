import logging
import os

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)

_whisper_model = None


def _get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        model_name = getattr(settings, 'WHISPER_MODEL', 'base')
        logger.info(f'Loading Whisper model: {model_name}')
        _whisper_model = WhisperModel(model_name, device='cpu', compute_type='int8')
    return _whisper_model


@shared_task
def transcribe_voice_message(message_id):
    from .models import Message

    try:
        message = Message.objects.select_related('chat').get(pk=message_id)
    except Message.DoesNotExist:
        logger.warning(f'Message {message_id} not found for transcription')
        return

    if not message.voice:
        logger.warning(f'Message {message_id} has no voice file')
        return

    if message.transcription:
        logger.info(f'Message {message_id} already transcribed')
        return

    audio_path = message.voice.path
    if not os.path.exists(audio_path):
        logger.error(f'Voice file not found: {audio_path}')
        return

    try:
        model = _get_whisper_model()
        segments, info = model.transcribe(audio_path, language='ru')
        text = ' '.join(segment.text.strip() for segment in segments).strip()

        message.transcription = text
        message.save(update_fields=['transcription'])

        _notify_message_updated(message)
        logger.info(f'Transcribed message {message_id}: {text[:80]}')
    except Exception as exc:
        logger.exception(f'Failed to transcribe message {message_id}: {exc}')


def _notify_message_updated(message):
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        from .serializers import MessageSerializer

        channel_layer = get_channel_layer()
        if channel_layer is None:
            return

        serializer = MessageSerializer(message)
        data = serializer.data
        data['voice_url'] = _absolute_url(message.voice.url) if message.voice else None
        data['file_url'] = _absolute_url(message.file.url) if message.file else None

        async_to_sync(channel_layer.group_send)(
            f'chat_{message.chat_id}',
            {
                'type': 'chat_message_update',
                'message': data,
            }
        )
    except Exception as exc:
        logger.exception(f'Failed to notify chat about transcription: {exc}')


def _absolute_url(path):
    return path
