import secrets
from django.db import models
from django.conf import settings


class MaxChat(models.Model):
    CHAT_TYPE_CHOICES = [
        ('private', 'Личный'),
        ('group', 'Группа'),
        ('supergroup', 'Супергруппа'),
    ]

    chat_id = models.CharField(max_length=50, unique=True, verbose_name='ID чата')
    title = models.CharField(max_length=255, blank=True, verbose_name='Название')
    chat_type = models.CharField(max_length=20, choices=CHAT_TYPE_CHOICES, verbose_name='Тип чата')
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='max_chat',
        verbose_name='Пользователь'
    )

    class Meta:
        verbose_name = 'Чат MAX'
        verbose_name_plural = 'Чаты MAX'

    def __str__(self):
        return self.title or self.chat_id


class MaxMessage(models.Model):
    chat = models.ForeignKey(MaxChat, on_delete=models.CASCADE, related_name='messages', verbose_name='Чат')
    message_id = models.CharField(max_length=50, verbose_name='ID сообщения')
    text = models.TextField(blank=True, verbose_name='Текст')
    sender_name = models.CharField(max_length=255, blank=True, verbose_name='Отправитель')

    class Meta:
        verbose_name = 'Сообщение MAX'
        verbose_name_plural = 'Сообщения MAX'

    def __str__(self):
        return f'{self.chat} / {self.message_id}'


class MaxLinkCode(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='max_link_code',
        verbose_name='Пользователь'
    )
    code = models.CharField(max_length=32, unique=True, verbose_name='Код')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')

    class Meta:
        verbose_name = 'Код привязки MAX'
        verbose_name_plural = 'Коды привязки MAX'

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = secrets.token_urlsafe(16)[:16]
        super().save(*args, **kwargs)

    def is_expired(self):
        from django.utils import timezone
        return (timezone.now() - self.created_at).total_seconds() > 3600

    def __str__(self):
        return f'{self.user} / {self.code}'


class MaxNewsSuggestion(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'На рассмотрении'),
        (STATUS_APPROVED, 'Одобрена'),
        (STATUS_REJECTED, 'Отклонена'),
    ]

    message = models.ForeignKey(MaxMessage, on_delete=models.CASCADE, related_name='suggestions', verbose_name='Сообщение')
    title = models.CharField(max_length=255, verbose_name='Заголовок задачи')
    description = models.TextField(blank=True, verbose_name='Описание')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, verbose_name='Статус')
    created_task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='max_news_suggestions',
        verbose_name='Созданная задача'
    )

    class Meta:
        verbose_name = 'Предложение новости MAX'
        verbose_name_plural = 'Предложения новостей MAX'

    def __str__(self):
        return self.title
