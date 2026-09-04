from django.db import migrations, models


def set_initial_service_positions(apps, schema_editor):
    Service = apps.get_model('booking', 'Service')
    services = list(Service.objects.order_by('name', 'id'))
    for position, service in enumerate(services):
        service.position = position
    Service.objects.bulk_update(services, ['position'])


class Migration(migrations.Migration):
    dependencies = [
        ('booking', '0004_booking_request_flow'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='position',
            field=models.PositiveIntegerField(db_index=True, default=0, verbose_name='Позиция'),
        ),
        migrations.RunPython(set_initial_service_positions, migrations.RunPython.noop),
        migrations.AlterModelOptions(
            name='service',
            options={'ordering': ['position', 'id'], 'verbose_name': 'Услуга', 'verbose_name_plural': 'Услуги'},
        ),
    ]
