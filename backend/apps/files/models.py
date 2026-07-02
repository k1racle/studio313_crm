import os
from django.db import models
from django.conf import settings


class FileFolder(models.Model):
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='file_folders',
        verbose_name='Проект'
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='Родительская папка'
    )
    name = models.CharField(max_length=255, verbose_name='Название папки')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_folders',
        verbose_name='Создал'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создана')

    class Meta:
        verbose_name = 'Папка'
        verbose_name_plural = 'Папки'
        ordering = ['name']

    def __str__(self):
        return self.name


class ProjectFile(models.Model):
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='project_files',
        verbose_name='Проект'
    )
    folder = models.ForeignKey(
        FileFolder,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='files',
        verbose_name='Папка'
    )
    file = models.FileField(upload_to='project_files/%Y/%m/', verbose_name='Файл')
    name = models.CharField(max_length=255, blank=True, verbose_name='Название файла')
    description = models.TextField(blank=True, verbose_name='Описание')
    size = models.PositiveIntegerField(null=True, blank=True, verbose_name='Размер (байт)')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_files',
        verbose_name='Загрузил'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name='Загружен')

    class Meta:
        verbose_name = 'Файл проекта'
        verbose_name_plural = 'Файлы проектов'
        ordering = ['-uploaded_at']

    def save(self, *args, **kwargs):
        if not self.name and self.file:
            self.name = os.path.basename(self.file.name)
        if self.file and not self.size:
            self.size = self.file.size
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name or str(self.file)


class ProjectLink(models.Model):
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='project_links',
        verbose_name='Проект'
    )
    folder = models.ForeignKey(
        FileFolder,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='links',
        verbose_name='Папка'
    )
    name = models.CharField(max_length=255, verbose_name='Название')
    url = models.URLField(verbose_name='Ссылка')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_links',
        verbose_name='Создал'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создана')

    class Meta:
        verbose_name = 'Ссылка'
        verbose_name_plural = 'Ссылки'
        ordering = ['-created_at']

    def __str__(self):
        return self.name
