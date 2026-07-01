# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('media_plan', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='publication',
            name='platform',
            field=models.CharField(
                choices=[
                    ('telegram', 'Telegram'),
                    ('vk', 'VK'),
                    ('max', 'MAX'),
                    ('dzen', 'Дзен'),
                    ('youtube', 'YouTube'),
                    ('rutube', 'RuTube'),
                    ('instagram', 'Instagram'),
                    ('site', 'Сайт'),
                    ('other', 'Другое'),
                ],
                default='other',
                max_length=20,
                verbose_name='Платформа',
            ),
        ),
    ]
