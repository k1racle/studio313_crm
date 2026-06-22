import secrets
from django.db import models
from django.utils import timezone
from apps.clients.models import Client


class ClientAccessToken(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='access_tokens', verbose_name='Клиент')
    token = models.CharField(max_length=64, unique=True, verbose_name='Токен')
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name='Истекает')
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')

    class Meta:
        verbose_name = 'Токен доступа клиента'
        verbose_name_plural = 'Токены доступа клиентов'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    def is_expired(self):
        if self.expires_at and self.expires_at < timezone.now():
            return True
        return False

    def __str__(self):
        return f'Токен {self.client.name}'
