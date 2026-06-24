# Generated manually based on server makemigrations output

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('max_bot', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='maxchat',
            name='chat_type',
            field=models.CharField(
                choices=[
                    ('private', 'Личный'),
                    ('group', 'Группа'),
                    ('supergroup', 'Супергруппа'),
                ],
                max_length=20,
                verbose_name='Тип чата',
            ),
        ),
    ]
