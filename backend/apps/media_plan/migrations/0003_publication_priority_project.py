# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('media_plan', '0002_alter_publication_platform'),
        ('projects', '0002_project_is_archived'),
    ]

    operations = [
        migrations.AddField(
            model_name='publication',
            name='priority',
            field=models.CharField(
                choices=[('low', 'Низкий'), ('medium', 'Средний'), ('high', 'Высокий'), ('critical', 'Критический')],
                default='medium',
                max_length=20,
                verbose_name='Приоритет',
            ),
        ),
        migrations.AddField(
            model_name='publication',
            name='project',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='publications',
                to='projects.project',
                verbose_name='Проект',
            ),
        ),
    ]
