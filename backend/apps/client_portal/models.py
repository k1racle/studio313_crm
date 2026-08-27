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


class MaterialApproval(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_CHANGES_REQUESTED = 'changes_requested'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Ожидает решения'),
        (STATUS_APPROVED, 'Согласовано'),
        (STATUS_CHANGES_REQUESTED, 'Нужны правки'),
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='material_approvals', verbose_name='Клиент')
    project = models.ForeignKey('projects.Project', on_delete=models.SET_NULL, null=True, blank=True, related_name='material_approvals', verbose_name='Проект')
    production = models.ForeignKey('production.Production', on_delete=models.SET_NULL, null=True, blank=True, related_name='material_approvals', verbose_name='Продакшен')
    title = models.CharField(max_length=255, verbose_name='Название материала')
    description = models.TextField(blank=True, verbose_name='Комментарий для клиента')
    file = models.FileField(upload_to='client_approvals/', blank=True, verbose_name='Файл')
    external_url = models.URLField(blank=True, verbose_name='Внешняя ссылка')
    due_date = models.DateField(null=True, blank=True, verbose_name='Желаемый срок ответа')
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default=STATUS_PENDING, verbose_name='Статус')
    client_comment = models.TextField(blank=True, verbose_name='Комментарий клиента')
    submitted_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='submitted_material_approvals', verbose_name='Отправил')
    responded_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата ответа')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлено')

    class Meta:
        verbose_name = 'Согласование материала'
        verbose_name_plural = 'Согласования материалов'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} — {self.client.name}'
