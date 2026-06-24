# Generated manually

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tasks', '0005_alter_task_source'),
    ]

    operations = [
        migrations.CreateModel(
            name='MaxChat',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('chat_id', models.CharField(max_length=50, unique=True, verbose_name='ID чата')),
                ('title', models.CharField(blank=True, max_length=255, verbose_name='Название')),
                ('chat_type', models.CharField(max_length=20, verbose_name='Тип чата')),
            ],
            options={
                'verbose_name': 'Чат MAX',
                'verbose_name_plural': 'Чаты MAX',
            },
        ),
        migrations.CreateModel(
            name='MaxLinkCode',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=32, unique=True, verbose_name='Код')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создан')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='max_link_code', to=settings.AUTH_USER_MODEL, verbose_name='Пользователь')),
            ],
            options={
                'verbose_name': 'Код привязки MAX',
                'verbose_name_plural': 'Коды привязки MAX',
            },
        ),
        migrations.CreateModel(
            name='MaxMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('message_id', models.CharField(max_length=50, verbose_name='ID сообщения')),
                ('text', models.TextField(blank=True, verbose_name='Текст')),
                ('sender_name', models.CharField(blank=True, max_length=255, verbose_name='Отправитель')),
                ('chat', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='max_bot.maxchat', verbose_name='Чат')),
            ],
            options={
                'verbose_name': 'Сообщение MAX',
                'verbose_name_plural': 'Сообщения MAX',
            },
        ),
        migrations.CreateModel(
            name='MaxNewsSuggestion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255, verbose_name='Заголовок задачи')),
                ('description', models.TextField(blank=True, verbose_name='Описание')),
                ('status', models.CharField(choices=[('pending', 'На рассмотрении'), ('approved', 'Одобрена'), ('rejected', 'Отклонена')], default='pending', max_length=20, verbose_name='Статус')),
                ('created_task', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='max_news_suggestions', to='tasks.task', verbose_name='Созданная задача')),
                ('message', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='suggestions', to='max_bot.maxmessage', verbose_name='Сообщение')),
            ],
            options={
                'verbose_name': 'Предложение новости MAX',
                'verbose_name_plural': 'Предложения новостей MAX',
            },
        ),
        migrations.AddField(
            model_name='maxchat',
            name='user',
            field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='max_chat', to=settings.AUTH_USER_MODEL, verbose_name='Пользователь'),
        ),
    ]
