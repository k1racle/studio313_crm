# Generated manually

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('projects', '0002_project_is_archived'),
    ]

    operations = [
        migrations.CreateModel(
            name='FileFolder',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255, verbose_name='Название папки')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создана')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_folders', to=settings.AUTH_USER_MODEL, verbose_name='Создал')),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='children', to='files.filefolder', verbose_name='Родительская папка')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='file_folders', to='projects.project', verbose_name='Проект')),
            ],
            options={
                'verbose_name': 'Папка',
                'verbose_name_plural': 'Папки',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='ProjectFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to='project_files/%Y/%m/', verbose_name='Файл')),
                ('name', models.CharField(blank=True, max_length=255, verbose_name='Название файла')),
                ('description', models.TextField(blank=True, verbose_name='Описание')),
                ('size', models.PositiveIntegerField(blank=True, null=True, verbose_name='Размер (байт)')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True, verbose_name='Загружен')),
                ('folder', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='files', to='files.filefolder', verbose_name='Папка')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='project_files', to='projects.project', verbose_name='Проект')),
                ('uploaded_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='uploaded_files', to=settings.AUTH_USER_MODEL, verbose_name='Загрузил')),
            ],
            options={
                'verbose_name': 'Файл проекта',
                'verbose_name_plural': 'Файлы проектов',
                'ordering': ['-uploaded_at'],
            },
        ),
    ]
