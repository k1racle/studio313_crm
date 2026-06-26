from django.db import models


class Client(models.Model):
    name = models.CharField(max_length=255, db_index=True, verbose_name='Имя')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон')
    email = models.EmailField(blank=True, verbose_name='Email')
    telegram = models.CharField(max_length=100, blank=True, verbose_name='Telegram')
    birthday = models.DateField(null=True, blank=True, verbose_name='Дата рождения')
    notes = models.TextField(blank=True, verbose_name='Заметки')
    is_archived = models.BooleanField(default=False, verbose_name='В архиве')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлён')

    class Meta:
        verbose_name = 'Клиент'
        verbose_name_plural = 'Клиенты'
        ordering = ['name']

    def __str__(self):
        return self.name
