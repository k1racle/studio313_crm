# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0003_client_birthday'),
    ]

    operations = [
        migrations.AlterField(
            model_name='client',
            name='name',
            field=models.CharField(db_index=True, max_length=255, verbose_name='Имя'),
        ),
        migrations.AlterModelOptions(
            name='client',
            options={'ordering': ['name'], 'verbose_name': 'Клиент', 'verbose_name_plural': 'Клиенты'},
        ),
    ]
