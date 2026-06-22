from rest_framework import serializers
from .models import TelegramChat, TelegramMessage, NewsSuggestion


class TelegramChatSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelegramChat
        fields = ['id', 'chat_id', 'title', 'chat_type', 'is_active']


class TelegramMessageSerializer(serializers.ModelSerializer):
    chat = TelegramChatSerializer(read_only=True)

    class Meta:
        model = TelegramMessage
        fields = ['id', 'chat', 'message_id', 'text', 'sender_name', 'created_at']


class NewsSuggestionSerializer(serializers.ModelSerializer):
    message = TelegramMessageSerializer(read_only=True)

    class Meta:
        model = NewsSuggestion
        fields = ['id', 'message', 'title', 'description', 'status', 'created_task', 'created_at']
