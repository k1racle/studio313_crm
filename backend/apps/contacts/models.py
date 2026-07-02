from django.db import models


class Contact(models.Model):
    full_name = models.CharField(max_length=255, verbose_name='ФИО')
    organization = models.CharField(max_length=255, blank=True, verbose_name='Организация')
    position = models.CharField(max_length=255, blank=True, verbose_name='Должность')
    phone = models.CharField(max_length=50, blank=True, verbose_name='Телефон')
    email = models.EmailField(blank=True, verbose_name='Email')
    messengers = models.CharField(max_length=255, blank=True, verbose_name='Мессенджеры')
    notes = models.TextField(blank=True, verbose_name='Заметки')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлён')

    class Meta:
        verbose_name = 'Контакт'
        verbose_name_plural = 'Контакты'
        ordering = ['full_name']

    def __str__(self):
        return self.full_name
