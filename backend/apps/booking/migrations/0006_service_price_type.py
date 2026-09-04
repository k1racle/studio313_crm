from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('booking', '0005_service_position'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='price_type',
            field=models.CharField(
                choices=[('hourly', 'За час'), ('fixed', 'За услугу')],
                default='hourly',
                max_length=16,
                verbose_name='Тип цены',
            ),
        ),
    ]
