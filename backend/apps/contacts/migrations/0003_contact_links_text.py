from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contacts', '0002_contact_extra_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='contact',
            name='messengers',
            field=models.TextField(blank=True, verbose_name='Мессенджеры'),
        ),
        migrations.AlterField(
            model_name='contact',
            name='social_networks',
            field=models.TextField(blank=True, verbose_name='Соцсети'),
        ),
    ]
