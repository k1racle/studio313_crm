from django.contrib import admin
from .models import TelegramChat, TelegramMessage, NewsSuggestion, TelegramLinkCode


@admin.register(TelegramChat)
class TelegramChatAdmin(admin.ModelAdmin):
    list_display = ['chat_id', 'title', 'chat_type', 'user', 'is_active', 'created_at']
    list_filter = ['chat_type', 'is_active']


@admin.register(TelegramMessage)
class TelegramMessageAdmin(admin.ModelAdmin):
    list_display = ['chat', 'sender_name', 'text_preview', 'created_at']
    search_fields = ['text', 'sender_name']

    def text_preview(self, obj):
        return obj.text[:100]
    text_preview.short_description = 'Текст'


@admin.register(NewsSuggestion)
class NewsSuggestionAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'created_task', 'created_at']
    list_filter = ['status']


@admin.register(TelegramLinkCode)
class TelegramLinkCodeAdmin(admin.ModelAdmin):
    list_display = ['user', 'code', 'created_at']
