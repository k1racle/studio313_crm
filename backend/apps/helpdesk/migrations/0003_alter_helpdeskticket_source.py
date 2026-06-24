# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('helpdesk', '0002_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='helpdeskticket',
            name='source',
            field=models.CharField(
                choices=[
                    ('telegram', 'Telegram'),
                    ('form', 'Форма'),
                    ('manual', 'Вручную'),
                    ('max', 'MAX'),
                ],
                default='manual',
                max_length=20,
                verbose_name='Источник',
            ),
        ),
    ]
