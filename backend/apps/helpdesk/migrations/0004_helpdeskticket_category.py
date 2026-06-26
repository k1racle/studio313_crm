# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('helpdesk', '0003_alter_helpdeskticket_source'),
    ]

    operations = [
        migrations.AddField(
            model_name='helpdeskticket',
            name='category',
            field=models.CharField(
                choices=[
                    ('technical', 'Техническая проблема'),
                    ('payment', 'Вопрос по оплате'),
                    ('manager_help', 'Помощь менеджера'),
                    ('other', 'Другое'),
                ],
                default='other',
                max_length=20,
                verbose_name='Категория',
            ),
        ),
    ]
