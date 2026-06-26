# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='KnowledgeCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, verbose_name='Название категории')),
                ('order', models.PositiveIntegerField(default=0, verbose_name='Порядок')),
            ],
            options={
                'verbose_name': 'Категория базы знаний',
                'verbose_name_plural': 'Категории базы знаний',
                'ordering': ['order', 'name'],
            },
        ),
        migrations.CreateModel(
            name='KnowledgeItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255, verbose_name='Название')),
                ('description', models.TextField(blank=True, verbose_name='Описание')),
                ('kind', models.CharField(choices=[('text', 'Текст'), ('video', 'Видео'), ('slides', 'Слайды')], default='text', max_length=20, verbose_name='Тип')),
                ('text_content', models.TextField(blank=True, verbose_name='Текстовый материал')),
                ('video_url', models.URLField(blank=True, verbose_name='Ссылка на видео')),
                ('is_published', models.BooleanField(default=True, verbose_name='Опубликовано')),
                ('order', models.PositiveIntegerField(default=0, verbose_name='Порядок')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создан')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Обновлён')),
                ('category', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='items', to='knowledge_base.knowledgecategory', verbose_name='Категория')),
            ],
            options={
                'verbose_name': 'Материал базы знаний',
                'verbose_name_plural': 'Материалы базы знаний',
                'ordering': ['order', 'title'],
            },
        ),
        migrations.CreateModel(
            name='Slide',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(upload_to='knowledge/slides/', verbose_name='Изображение слайда')),
                ('caption', models.CharField(blank=True, max_length=255, verbose_name='Подпись')),
                ('order', models.PositiveIntegerField(default=0, verbose_name='Порядок')),
                ('item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='slides', to='knowledge_base.knowledgeitem', verbose_name='Материал')),
            ],
            options={
                'verbose_name': 'Слайд',
                'verbose_name_plural': 'Слайды',
                'ordering': ['order'],
            },
        ),
    ]
