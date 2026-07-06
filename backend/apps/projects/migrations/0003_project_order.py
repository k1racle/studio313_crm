# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0002_project_is_archived'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='order',
            field=models.PositiveIntegerField(default=0, verbose_name='Порядок'),
        ),
        migrations.AlterModelOptions(
            name='project',
            options={'ordering': ['order', '-created_at'], 'verbose_name': 'Проект', 'verbose_name_plural': 'Проекты'},
        ),
    ]
