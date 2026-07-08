from django.db import models
from django.conf import settings
from apps.tasks.models import Task


class Platform(models.Model):
    slug = models.SlugField(unique=True, verbose_name='Код')
    name = models.CharField(max_length=50, verbose_name='Название')

    class Meta:
        verbose_name = 'Платформа'
        verbose_name_plural = 'Платформы'
        ordering = ['name']

    def __str__(self):
        return self.name


class Publication(models.Model):
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

    PRIORITY_LOW = 'low'
    PRIORITY_MEDIUM = 'medium'
    PRIORITY_HIGH = 'high'
    PRIORITY_CRITICAL = 'critical'

    PRIORITY_CHOICES = [
        (PRIORITY_LOW, 'Низкий'),
        (PRIORITY_MEDIUM, 'Средний'),
        (PRIORITY_HIGH, 'Высокий'),
        (PRIORITY_CRITICAL, 'Критический'),
    ]

    title = models.CharField(max_length=255, verbose_name='Тема публикации')
    description = models.TextField(blank=True, verbose_name='Текст / описание')
    platforms = models.ManyToManyField(
        Platform,
        blank=True,
        related_name='publications',
        verbose_name='Платформы',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT, verbose_name='Статус')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default=PRIORITY_MEDIUM, verbose_name='Приоритет')
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='publications',
        verbose_name='Проект'
    )
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
        platforms = ', '.join(self.platforms.values_list('name', flat=True))
        return f'{self.title} ({platforms or "не указано"})'


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
