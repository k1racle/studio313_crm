from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contacts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='contact',
            name='social_networks',
            field=models.CharField(blank=True, max_length=255, verbose_name='Соцсети'),
        ),
        migrations.AddField(
            model_name='contact',
            name='birth_date',
            field=models.DateField(blank=True, null=True, verbose_name='Дата рождения'),
        ),
        migrations.AddField(
            model_name='contact',
            name='city',
            field=models.CharField(blank=True, max_length=255, verbose_name='Город'),
        ),
        migrations.AddField(
            model_name='contact',
            name='quick_communication',
            field=models.BooleanField(default=False, verbose_name='Оперативный канал связи'),
        ),
    ]
