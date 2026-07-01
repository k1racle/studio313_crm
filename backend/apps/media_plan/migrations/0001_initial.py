# Generated manually

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tasks', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Publication',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255, verbose_name='Тема публикации')),
                ('description', models.TextField(blank=True, verbose_name='Текст / описание')),
                ('platform', models.CharField(choices=[('telegram', 'Telegram'), ('vk', 'VK'), ('max', 'MAX'), ('dzen', 'Дзен'), ('site', 'Сайт'), ('other', 'Другое')], default='other', max_length=20, verbose_name='Платформа')),
                ('status', models.CharField(choices=[('draft', 'Черновик'), ('approval', 'На согласовании'), ('scheduled', 'Запланировано'), ('published', 'Опубликовано'), ('cancelled', 'Отменено')], default='draft', max_length=20, verbose_name='Статус')),
                ('publish_at', models.DateTimeField(verbose_name='Дата и время публикации')),
                ('reminder_sent_at', models.DateTimeField(blank=True, null=True, verbose_name='Напоминание отправлено')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создано')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Обновлено')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_media_plan_publications', to=settings.AUTH_USER_MODEL, verbose_name='Создал')),
                ('linked_task', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='publications', to='tasks.task', verbose_name='Связанная задача')),
                ('responsible', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='media_plan_publications', to=settings.AUTH_USER_MODEL, verbose_name='Ответственный')),
            ],
            options={
                'verbose_name': 'Публикация',
                'verbose_name_plural': 'Публикации',
                'ordering': ['publish_at'],
            },
        ),
        migrations.CreateModel(
            name='PublicationAttachment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to='media_plan/%Y/%m/', verbose_name='Файл')),
                ('caption', models.CharField(blank=True, max_length=255, verbose_name='Подпись')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создано')),
                ('publication', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attachments', to='media_plan.publication', verbose_name='Публикация')),
            ],
            options={
                'verbose_name': 'Вложение публикации',
                'verbose_name_plural': 'Вложения публикаций',
                'ordering': ['created_at'],
            },
        ),
    ]
