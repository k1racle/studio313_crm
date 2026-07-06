# Generated manually

from django.conf import settings
from django.db import migrations, models


def copy_assignee_to_assignees(apps, schema_editor):
    Task = apps.get_model('tasks', 'Task')
    for task in Task.objects.filter(assignee__isnull=False):
        task.assignees.add(task.assignee)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0010_task_archived_at'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='task',
            name='assignee',
        ),
        migrations.AddField(
            model_name='task',
            name='assignees',
            field=models.ManyToManyField(blank=True, related_name='assigned_tasks', to=settings.AUTH_USER_MODEL, verbose_name='Исполнители'),
        ),
        migrations.RunPython(copy_assignee_to_assignees, noop),
    ]
