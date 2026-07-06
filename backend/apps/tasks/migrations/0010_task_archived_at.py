# Generated manually

from django.db import migrations, models
from django.utils import timezone


def fill_archived_at(apps, schema_editor):
    Task = apps.get_model('tasks', 'Task')
    for task in Task.objects.filter(is_archived=True, archived_at__isnull=True):
        task.archived_at = task.updated_at or timezone.now()
        task.save(update_fields=['archived_at'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0009_task_members_reviewassigneeconfig'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='archived_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Дата архивации'),
        ),
        migrations.RunPython(fill_archived_at, noop),
    ]
