# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0004_push_subscription_and_push_enabled'),
    ]

    operations = [
        migrations.AddField(
            model_name='usernotificationpreference',
            name='max_enabled',
            field=models.BooleanField(default=True, verbose_name='MAX-уведомления'),
        ),
        migrations.AlterField(
            model_name='notificationlog',
            name='channel',
            field=models.CharField(
                choices=[
                    ('email', 'Email'),
                    ('sms', 'SMS'),
                    ('telegram', 'Telegram'),
                    ('max', 'MAX'),
                ],
                max_length=20,
                verbose_name='Канал',
            ),
        ),
    ]
