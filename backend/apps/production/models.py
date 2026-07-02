from django.db import models
from django.conf import settings
from apps.clients.models import Client


class Production(models.Model):
    STATUS_NEW = 'new'
    STATUS_SHOOTING = 'shooting'
    STATUS_EDITING = 'editing'
    STATUS_REVIEW = 'review'
    STATUS_CORRECTIONS = 'corrections'
    STATUS_SENT_TO_CLIENT = 'sent_to_client'

    STATUS_CHOICES = [
        (STATUS_NEW, 'Новая'),
        (STATUS_SHOOTING, 'Съёмка'),
        (STATUS_EDITING, 'Монтаж'),
        (STATUS_REVIEW, 'Отсмотр'),
        (STATUS_CORRECTIONS, 'Внесение правок'),
        (STATUS_SENT_TO_CLIENT, 'Отправлено клиенту'),
    ]

    title = models.CharField(max_length=255, verbose_name='Название')
    description = models.TextField(blank=True, verbose_name='Описание')
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_NEW,
        verbose_name='Статус'
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='productions',
        verbose_name='Проект'
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='productions',
        verbose_name='Клиент'
    )
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_productions',
        verbose_name='Создал'
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_productions',
        verbose_name='Ответственный'
    )
    due_date = models.DateTimeField(null=True, blank=True, verbose_name='Срок')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлено')

    class Meta:
        verbose_name = 'Производство'
        verbose_name_plural = 'Производство'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class ProductionComment(models.Model):
    production = models.ForeignKey(
        Production,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name='Производство'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name='Автор'
    )
    text = models.TextField(verbose_name='Текст')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')

    class Meta:
        verbose_name = 'Комментарий'
        verbose_name_plural = 'Комментарии'
        ordering = ['created_at']


class ProductionAttachment(models.Model):
    production = models.ForeignKey(
        Production,
        on_delete=models.CASCADE,
        related_name='attachments',
        verbose_name='Производство'
    )
    file = models.FileField(upload_to='production_attachments/', verbose_name='Файл')
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name='Загружен')

    class Meta:
        verbose_name = 'Вложение'
        verbose_name_plural = 'Вложения'
