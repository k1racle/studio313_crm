from django.db import models


class KnowledgeCategory(models.Model):
    name = models.CharField(max_length=100, verbose_name='Название категории')
    order = models.PositiveIntegerField(default=0, verbose_name='Порядок')

    class Meta:
        verbose_name = 'Категория базы знаний'
        verbose_name_plural = 'Категории базы знаний'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class KnowledgeItem(models.Model):
    KIND_TEXT = 'text'
    KIND_VIDEO = 'video'
    KIND_SLIDES = 'slides'

    KIND_CHOICES = [
        (KIND_TEXT, 'Текст'),
        (KIND_VIDEO, 'Видео'),
        (KIND_SLIDES, 'Слайды'),
    ]

    category = models.ForeignKey(
        KnowledgeCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='items',
        verbose_name='Категория',
    )
    title = models.CharField(max_length=255, verbose_name='Название')
    description = models.TextField(blank=True, verbose_name='Описание')
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default=KIND_TEXT, verbose_name='Тип')
    text_content = models.TextField(blank=True, verbose_name='Текстовый материал')
    video_url = models.URLField(blank=True, verbose_name='Ссылка на видео')
    is_published = models.BooleanField(default=True, verbose_name='Опубликовано')
    order = models.PositiveIntegerField(default=0, verbose_name='Порядок')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлён')

    class Meta:
        verbose_name = 'Материал базы знаний'
        verbose_name_plural = 'Материалы базы знаний'
        ordering = ['order', 'title']

    def __str__(self):
        return self.title


class Slide(models.Model):
    item = models.ForeignKey(
        KnowledgeItem,
        on_delete=models.CASCADE,
        related_name='slides',
        verbose_name='Материал',
    )
    image = models.ImageField(upload_to='knowledge/slides/', verbose_name='Изображение слайда')
    caption = models.CharField(max_length=255, blank=True, verbose_name='Подпись')
    order = models.PositiveIntegerField(default=0, verbose_name='Порядок')

    class Meta:
        verbose_name = 'Слайд'
        verbose_name_plural = 'Слайды'
        ordering = ['order']

    def __str__(self):
        return f'Слайд {self.order + 1} — {self.item.title}'
