# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0007_alter_task_status'),
    ]

    operations = [
        migrations.AlterField(
            model_name='task',
            name='status',
            field=models.CharField(
                choices=[
                    ('new', 'Новая'),
                    ('in_progress', 'В работе'),
                    ('shooting', 'Съемка'),
                    ('editing', 'Монтаж'),
                    ('approval', 'На согласовании'),
                    ('review', 'На проверке'),
                    ('content_placement', 'Выкладка контента'),
                    ('done', 'Выполнена'),
                    ('canceled', 'Отменена'),
                ],
                default='new',
                max_length=20,
                verbose_name='Статус',
            ),
        ),
    ]
