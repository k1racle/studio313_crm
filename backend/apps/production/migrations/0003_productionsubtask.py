from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('production', '0002_production_assignees'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProductionSubTask',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255, verbose_name='Название')),
                ('is_done', models.BooleanField(default=False, verbose_name='Выполнено')),
                ('order', models.PositiveIntegerField(default=0, verbose_name='Порядок')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создано')),
                ('production', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subtasks', to='production.production', verbose_name='Производство')),
            ],
            options={
                'verbose_name': 'Подзадача',
                'verbose_name_plural': 'Подзадачи',
                'ordering': ['order', 'created_at'],
            },
        ),
    ]
