from django.db import models
from django.conf import settings


class NotificationLog(models.Model):
    CHANNEL_EMAIL = 'email'
    CHANNEL_SMS = 'sms'
    CHANNEL_TELEGRAM = 'telegram'
    CHANNEL_MAX = 'max'

    CHANNEL_CHOICES = [
        (CHANNEL_EMAIL, 'Email'),
        (CHANNEL_SMS, 'SMS'),
        (CHANNEL_TELEGRAM, 'Telegram'),
        (CHANNEL_MAX, 'MAX'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_logs', verbose_name='Пользователь')
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, verbose_name='Канал')
    subject = models.CharField(max_length=255, verbose_name='Тема')
    body = models.TextField(verbose_name='Текст')
    sent_at = models.DateTimeField(auto_now_add=True, verbose_name='Отправлено')
    is_success = models.BooleanField(default=True, verbose_name='Успешно')
    error_message = models.TextField(blank=True, verbose_name='Ошибка')

    class Meta:
        verbose_name = 'Лог уведомления'
        verbose_name_plural = 'Логи уведомлений'
        ordering = ['-sent_at']


class InAppNotification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='in_app_notifications', verbose_name='Пользователь')
    title = models.CharField(max_length=255, verbose_name='Заголовок')
    message = models.TextField(verbose_name='Текст')
    link = models.CharField(max_length=255, blank=True, verbose_name='Ссылка')
    is_read = models.BooleanField(default=False, verbose_name='Прочитано')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')

    class Meta:
        verbose_name = 'Внутреннее уведомление'
        verbose_name_plural = 'Внутренние уведомления'
        ordering = ['-created_at']


class UserNotificationPreference(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_preference', verbose_name='Пользователь')
    email_enabled = models.BooleanField(default=True, verbose_name='Email-уведомления')
    telegram_enabled = models.BooleanField(default=True, verbose_name='Telegram-уведомления')
    max_enabled = models.BooleanField(default=True, verbose_name='MAX-уведомления')
    sms_enabled = models.BooleanField(default=False, verbose_name='SMS-уведомления')
    push_enabled = models.BooleanField(default=True, verbose_name='Push-уведомления')

    class Meta:
        verbose_name = 'Настройка уведомлений'
        verbose_name_plural = 'Настройки уведомлений'

    def __str__(self):
        return f'Настройки уведомлений {self.user}'


class PushSubscription(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='push_subscriptions', verbose_name='Пользователь')
    endpoint = models.URLField(verbose_name='Endpoint')
    p256dh = models.CharField(max_length=255, verbose_name='p256dh')
    auth = models.CharField(max_length=255, verbose_name='auth')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')

    class Meta:
        verbose_name = 'Push-подписка'
        verbose_name_plural = 'Push-подписки'
        unique_together = ['user', 'endpoint']

    def __str__(self):
        return f'Подписка {self.user}'
