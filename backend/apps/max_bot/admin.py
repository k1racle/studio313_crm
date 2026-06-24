from django.contrib import admin
from .models import MaxChat, MaxMessage, MaxLinkCode, MaxNewsSuggestion


@admin.register(MaxChat)
class MaxChatAdmin(admin.ModelAdmin):
    list_display = ['chat_id', 'title', 'chat_type', 'user']
    list_filter = ['chat_type']
    search_fields = ['chat_id', 'title']


@admin.register(MaxMessage)
class MaxMessageAdmin(admin.ModelAdmin):
    list_display = ['chat', 'message_id', 'sender_name', 'text_preview']
    search_fields = ['text', 'sender_name']

    def text_preview(self, obj):
        return obj.text[:100] if obj.text else '—'
    text_preview.short_description = 'Текст'


@admin.register(MaxLinkCode)
class MaxLinkCodeAdmin(admin.ModelAdmin):
    list_display = ['user', 'code', 'created_at']


@admin.register(MaxNewsSuggestion)
class MaxNewsSuggestionAdmin(admin.ModelAdmin):
    list_display = ['title', 'message', 'status', 'created_task']
    list_filter = ['status']
