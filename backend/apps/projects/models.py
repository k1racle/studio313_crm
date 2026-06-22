from django.db import models
from django.conf import settings


class Project(models.Model):
    name = models.CharField(max_length=255, verbose_name='Название')
    description = models.TextField(blank=True, verbose_name='Описание')
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='projects',
        blank=True,
        verbose_name='Участники'
    )
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    is_archived = models.BooleanField(default=False, verbose_name='В архиве')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')

    class Meta:
        verbose_name = 'Проект'
        verbose_name_plural = 'Проекты'
        ordering = ['-created_at']

    def __str__(self):
        return self.name
