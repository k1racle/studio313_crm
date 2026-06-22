from django.db import models
from django.conf import settings


class HelpdeskTicket(models.Model):
    STATUS_OPEN = 'open'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_WAITING = 'waiting'
    STATUS_CLOSED = 'closed'

    STATUS_CHOICES = [
        (STATUS_OPEN, 'Открыт'),
        (STATUS_IN_PROGRESS, 'В работе'),
        (STATUS_WAITING, 'Ожидание'),
        (STATUS_CLOSED, 'Закрыт'),
    ]

    PRIORITY_LOW = 'low'
    PRIORITY_MEDIUM = 'medium'
    PRIORITY_HIGH = 'high'

    PRIORITY_CHOICES = [
        (PRIORITY_LOW, 'Низкий'),
        (PRIORITY_MEDIUM, 'Средний'),
        (PRIORITY_HIGH, 'Высокий'),
    ]

    SOURCE_TELEGRAM = 'telegram'
    SOURCE_FORM = 'form'
    SOURCE_MANUAL = 'manual'

    SOURCE_CHOICES = [
        (SOURCE_TELEGRAM, 'Telegram'),
        (SOURCE_FORM, 'Форма'),
        (SOURCE_MANUAL, 'Вручную'),
    ]

    subject = models.CharField(max_length=255, verbose_name='Тема')
    description = models.TextField(verbose_name='Описание')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN, verbose_name='Статус')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default=PRIORITY_MEDIUM, verbose_name='Приоритет')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default=SOURCE_MANUAL, verbose_name='Источник')
    requester_name = models.CharField(max_length=255, blank=True, verbose_name='Имя заявителя')
    requester_contact = models.CharField(max_length=255, blank=True, verbose_name='Контакт заявителя')
    assignee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='helpdesk_tickets', verbose_name='Исполнитель')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлён')

    class Meta:
        verbose_name = 'Тикет'
        verbose_name_plural = 'Тикеты'
        ordering = ['-created_at']

    def __str__(self):
        return self.subject


class TicketComment(models.Model):
    ticket = models.ForeignKey(HelpdeskTicket, on_delete=models.CASCADE, related_name='comments', verbose_name='Тикет')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name='Автор')
    text = models.TextField(verbose_name='Текст')
    is_internal = models.BooleanField(default=False, verbose_name='Внутренний')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')

    class Meta:
        verbose_name = 'Комментарий к тикету'
        verbose_name_plural = 'Комментарии к тикетам'
        ordering = ['created_at']
