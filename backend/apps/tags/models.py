from django.db import models


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True, verbose_name='Название')
    color = models.CharField(max_length=7, default='#3b82f6', verbose_name='Цвет')
    tasks = models.ManyToManyField('tasks.Task', related_name='tags', blank=True, verbose_name='Задачи')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')

    class Meta:
        verbose_name = 'Тег'
        verbose_name_plural = 'Теги'
        ordering = ['name']

    def __str__(self):
        return self.name
