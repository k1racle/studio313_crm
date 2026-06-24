# Generated manually

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('notifications', '0003_usernotificationpreference'),
    ]

    operations = [
        migrations.AddField(
            model_name='usernotificationpreference',
            name='push_enabled',
            field=models.BooleanField(default=True, verbose_name='Push-уведомления'),
        ),
        migrations.CreateModel(
            name='PushSubscription',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('endpoint', models.URLField(verbose_name='Endpoint')),
                ('p256dh', models.CharField(max_length=255, verbose_name='p256dh')),
                ('auth', models.CharField(max_length=255, verbose_name='auth')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создано')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='push_subscriptions', to=settings.AUTH_USER_MODEL, verbose_name='Пользователь')),
            ],
            options={
                'verbose_name': 'Push-подписка',
                'verbose_name_plural': 'Push-подписки',
            },
        ),
        migrations.AlterUniqueTogether(
            name='pushsubscription',
            unique_together={('user', 'endpoint')},
        ),
    ]
