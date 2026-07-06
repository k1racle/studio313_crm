# Generated manually

from django.db import migrations, models
from django.utils import timezone


def fill_archived_at(apps, schema_editor):
    Project = apps.get_model('projects', 'Project')
    for project in Project.objects.filter(is_archived=True, archived_at__isnull=True):
        project.archived_at = project.created_at or timezone.now()
        project.save(update_fields=['archived_at'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0003_project_order'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='archived_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Дата архивации'),
        ),
        migrations.RunPython(fill_archived_at, noop),
    ]
