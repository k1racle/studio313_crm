from django.contrib import admin
from .models import Chat, Message, Sticker


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ['id', 'type', 'name', 'created_at']
    list_filter = ['type']
    filter_horizontal = ['members']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'chat', 'sender', 'text_preview', 'created_at']
    list_filter = ['chat']

    def text_preview(self, obj):
        return obj.text[:50] if obj.text else '(без текста)'


@admin.register(Sticker)
class StickerAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'image']
