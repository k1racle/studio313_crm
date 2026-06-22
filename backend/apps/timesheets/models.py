from django.db import models
from django.conf import settings


class TimeEntry(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='time_entries', verbose_name='Пользователь')
    task = models.ForeignKey('tasks.Task', on_delete=models.CASCADE, related_name='time_entries', verbose_name='Задача')
    start_time = models.DateTimeField(verbose_name='Начало')
    end_time = models.DateTimeField(null=True, blank=True, verbose_name='Окончание')
    duration_minutes = models.PositiveIntegerField(null=True, blank=True, verbose_name='Длительность, мин')
    note = models.TextField(blank=True, verbose_name='Примечание')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')

    class Meta:
        verbose_name = 'Запись времени'
        verbose_name_plural = 'Записи времени'
        ordering = ['-start_time']

    def save(self, *args, **kwargs):
        if self.end_time and self.start_time:
            self.duration_minutes = int((self.end_time - self.start_time).total_seconds() / 60)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.user} — {self.task} ({self.duration_minutes or "—"} мин)'
