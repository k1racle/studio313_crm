# Generated manually

from django.conf import settings
from django.db import migrations, models


def copy_assignee_to_assignees(apps, schema_editor):
    Production = apps.get_model('production', 'Production')
    for production in Production.objects.filter(assignee__isnull=False):
        production.assignees.add(production.assignee)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('production', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='production',
            name='assignees',
            field=models.ManyToManyField(blank=True, related_name='assigned_productions', to=settings.AUTH_USER_MODEL, verbose_name='Исполнители'),
        ),
        migrations.RunPython(copy_assignee_to_assignees, noop),
        migrations.RemoveField(
            model_name='production',
            name='assignee',
        ),
    ]
