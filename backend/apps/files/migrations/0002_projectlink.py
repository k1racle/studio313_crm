# Generated manually

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('files', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProjectLink',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255, verbose_name='Название')),
                ('url', models.URLField(verbose_name='Ссылка')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создана')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_links', to=settings.AUTH_USER_MODEL, verbose_name='Создал')),
                ('folder', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='links', to='files.filefolder', verbose_name='Папка')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='project_links', to='projects.project', verbose_name='Проект')),
            ],
            options={
                'verbose_name': 'Ссылка',
                'verbose_name_plural': 'Ссылки',
                'ordering': ['-created_at'],
            },
        ),
    ]
