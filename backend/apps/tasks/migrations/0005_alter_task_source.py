# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0004_task_client_task_is_archived'),
    ]

    operations = [
        migrations.AlterField(
            model_name='task',
            name='source',
            field=models.CharField(
                choices=[
                    ('manual', 'Вручную'),
                    ('telegram', 'Telegram'),
                    ('helpdesk', 'Хелпдеск'),
                    ('max', 'MAX'),
                ],
                default='manual',
                max_length=20,
                verbose_name='Источник',
            ),
        ),
    ]
