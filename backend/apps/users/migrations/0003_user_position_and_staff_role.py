# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_user_patronymic'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='position',
            field=models.CharField(blank=True, max_length=150, verbose_name='Должность'),
        ),
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('admin', 'Администратор'),
                    ('director', 'Руководитель'),
                    ('manager', 'Менеджер'),
                    ('journalist', 'Журналист'),
                    ('staff', 'Сотрудник'),
                ],
                default='staff',
                max_length=20,
                verbose_name='Роль',
            ),
        ),
    ]
