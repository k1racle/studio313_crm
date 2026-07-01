from django.db import models
from django.conf import settings
from apps.tasks.models import Task


class Publication(models.Model):
    PLATFORM_TELEGRAM = 'telegram'
    PLATFORM_VK = 'vk'
    PLATFORM_MAX = 'max'
    PLATFORM_DZEN = 'dzen'
    PLATFORM_SITE = 'site'
    PLATFORM_OTHER = 'other'

    PLATFORM_CHOICES = [
        (PLATFORM_TELEGRAM, 'Telegram'),
        (PLATFORM_VK, 'VK'),
        (PLATFORM_MAX, 'MAX'),
        (PLATFORM_DZEN, 'Дзен'),
        (PLATFORM_SITE, 'Сайт'),
        (PLATFORM_OTHER, 'Другое'),
    ]

    STATUS_DRAFT = 'draft'
    STATUS_APPROVAL = 'approval'
    STATUS_SCHEDULED = 'scheduled'
    STATUS_PUBLISHED = 'published'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Черновик'),
        (STATUS_APPROVAL, 'На согласовании'),
        (STATUS_SCHEDULED, 'Запланировано'),
        (STATUS_PUBLISHED, 'Опубликовано'),
        (STATUS_CANCELLED, 'Отменено'),
    ]

    title = models.CharField(max_length=255, verbose_name='Тема публикации')
    description = models.TextField(blank=True, verbose_name='Текст / описание')
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES, default=PLATFORM_OTHER, verbose_name='Платформа')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT, verbose_name='Статус')
    publish_at = models.DateTimeField(verbose_name='Дата и время публикации')
    responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='media_plan_publications',
        verbose_name='Ответственный'
    )
    linked_task = models.ForeignKey(
        Task,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='publications',
        verbose_name='Связанная задача'
    )
    reminder_sent_at = models.DateTimeField(null=True, blank=True, verbose_name='Напоминание отправлено')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_media_plan_publications',
        verbose_name='Создал'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлено')

    class Meta:
        verbose_name = 'Публикация'
        verbose_name_plural = 'Публикации'
        ordering = ['publish_at']

    def __str__(self):
        return f'{self.title} ({self.get_platform_display()})'


class PublicationAttachment(models.Model):
    publication = models.ForeignKey(Publication, on_delete=models.CASCADE, related_name='attachments', verbose_name='Публикация')
    file = models.FileField(upload_to='media_plan/%Y/%m/', verbose_name='Файл')
    caption = models.CharField(max_length=255, blank=True, verbose_name='Подпись')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')

    class Meta:
        verbose_name = 'Вложение публикации'
        verbose_name_plural = 'Вложения публикаций'
        ordering = ['created_at']

    def __str__(self):
        return f'{self.publication} / {self.file}'
