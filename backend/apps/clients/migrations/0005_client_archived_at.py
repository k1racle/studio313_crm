# Generated manually

from django.db import migrations, models
from django.utils import timezone


def fill_archived_at(apps, schema_editor):
    Client = apps.get_model('clients', 'Client')
    for client in Client.objects.filter(is_archived=True, archived_at__isnull=True):
        client.archived_at = client.updated_at or timezone.now()
        client.save(update_fields=['archived_at'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0004_client_name_index_and_ordering'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='archived_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Дата архивации'),
        ),
        migrations.RunPython(fill_archived_at, noop),
    ]
