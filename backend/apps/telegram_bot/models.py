import secrets
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


class TelegramChat(models.Model):
    CHAT_PRIVATE = 'private'
    CHAT_GROUP = 'group'
    CHAT_SUPERGROUP = 'supergroup'
    CHAT_CHANNEL = 'channel'

    CHAT_TYPE_CHOICES = [
        (CHAT_PRIVATE, 'Личный'),
        (CHAT_GROUP, 'Группа'),
        (CHAT_SUPERGROUP, 'Супергруппа'),
        (CHAT_CHANNEL, 'Канал'),
    ]

    chat_id = models.CharField(max_length=50, unique=True, verbose_name='ID чата')
    title = models.CharField(max_length=255, blank=True, verbose_name='Название')
    chat_type = models.CharField(max_length=20, choices=CHAT_TYPE_CHOICES, verbose_name='Тип чата')
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='telegram_chat', verbose_name='Пользователь')
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')

    class Meta:
        verbose_name = 'Telegram чат'
        verbose_name_plural = 'Telegram чаты'

    def __str__(self):
        return self.title or self.chat_id


class TelegramMessage(models.Model):
    chat = models.ForeignKey(TelegramChat, on_delete=models.CASCADE, related_name='messages', verbose_name='Чат')
    message_id = models.CharField(max_length=50, verbose_name='ID сообщения')
    text = models.TextField(blank=True, verbose_name='Текст')
    sender_name = models.CharField(max_length=255, blank=True, verbose_name='Отправитель')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Получено')

    class Meta:
        verbose_name = 'Сообщение Telegram'
        verbose_name_plural = 'Сообщения Telegram'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.chat}: {self.text[:50]}'


class NewsSuggestion(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'На рассмотрении'),
        (STATUS_APPROVED, 'Одобрено'),
        (STATUS_REJECTED, 'Отклонено'),
    ]

    message = models.ForeignKey(TelegramMessage, on_delete=models.CASCADE, related_name='suggestions', verbose_name='Сообщение')
    title = models.CharField(max_length=255, verbose_name='Заголовок задачи')
    description = models.TextField(blank=True, verbose_name='Описание')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, verbose_name='Статус')
    created_task = models.ForeignKey('tasks.Task', on_delete=models.SET_NULL, null=True, blank=True, related_name='news_suggestions', verbose_name='Созданная задача')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создана')

    class Meta:
        verbose_name = 'Кандидат в новость'
        verbose_name_plural = 'Кандидаты в новости'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class TelegramLinkCode(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='telegram_link_code', verbose_name='Пользователь')
    code = models.CharField(max_length=32, unique=True, verbose_name='Код')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')

    class Meta:
        verbose_name = 'Код привязки Telegram'
        verbose_name_plural = 'Коды привязки Telegram'

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = secrets.token_urlsafe(16)
        super().save(*args, **kwargs)

    def is_expired(self):
        return self.created_at < timezone.now() - timedelta(hours=1)

    def __str__(self):
        return f'Код для {self.user}'
