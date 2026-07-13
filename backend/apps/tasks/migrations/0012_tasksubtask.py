from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('tasks', '0011_task_assignees'),
    ]

    operations = [
        migrations.CreateModel(
            name='TaskSubTask',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255, verbose_name='Название')),
                ('is_done', models.BooleanField(default=False, verbose_name='Выполнено')),
                ('order', models.PositiveIntegerField(default=0, verbose_name='Порядок')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создано')),
                ('task', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subtasks', to='tasks.task', verbose_name='Задача')),
            ],
            options={
                'verbose_name': 'Подзадача',
                'verbose_name_plural': 'Подзадачи',
                'ordering': ['order', 'created_at'],
            },
        ),
    ]
