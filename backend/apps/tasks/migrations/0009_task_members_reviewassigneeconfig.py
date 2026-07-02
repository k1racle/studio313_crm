# Generated manually

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tasks', '0008_alter_task_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='members',
            field=models.ManyToManyField(blank=True, related_name='task_memberships', to=settings.AUTH_USER_MODEL, verbose_name='Участники'),
        ),
        migrations.CreateModel(
            name='ReviewAssigneeConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('assignee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL, verbose_name='Ответственный на проверке')),
            ],
            options={
                'verbose_name': 'Ответственный на проверке',
                'verbose_name_plural': 'Ответственный на проверке',
            },
        ),
    ]
