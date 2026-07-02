# Generated manually

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('clients', '0004_client_name_index_and_ordering'),
        ('projects', '0002_project_is_archived'),
    ]

    operations = [
        migrations.CreateModel(
            name='Production',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255, verbose_name='Название')),
                ('description', models.TextField(blank=True, verbose_name='Описание')),
                ('status', models.CharField(choices=[('new', 'Новая'), ('shooting', 'Съёмка'), ('editing', 'Монтаж'), ('review', 'Отсмотр'), ('corrections', 'Внесение правок'), ('sent_to_client', 'Отправлено клиенту')], default='new', max_length=20, verbose_name='Статус')),
                ('due_date', models.DateTimeField(blank=True, null=True, verbose_name='Срок')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создано')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Обновлено')),
                ('assignee', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_productions', to=settings.AUTH_USER_MODEL, verbose_name='Ответственный')),
                ('client', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='productions', to='clients.client', verbose_name='Клиент')),
                ('creator', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_productions', to=settings.AUTH_USER_MODEL, verbose_name='Создал')),
                ('project', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='productions', to='projects.project', verbose_name='Проект')),
            ],
            options={
                'verbose_name': 'Производство',
                'verbose_name_plural': 'Производство',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ProductionComment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.TextField(verbose_name='Текст')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создан')),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL, verbose_name='Автор')),
                ('production', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments', to='production.production', verbose_name='Производство')),
            ],
            options={
                'verbose_name': 'Комментарий',
                'verbose_name_plural': 'Комментарии',
                'ordering': ['created_at'],
            },
        ),
        migrations.CreateModel(
            name='ProductionAttachment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to='production_attachments/', verbose_name='Файл')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True, verbose_name='Загружен')),
                ('production', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attachments', to='production.production', verbose_name='Производство')),
            ],
            options={
                'verbose_name': 'Вложение',
                'verbose_name_plural': 'Вложения',
            },
        ),
    ]
