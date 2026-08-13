from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0001_initial'),
        ('booking', '0003_booking_paid_amount'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='requester_name',
            field=models.CharField(blank=True, default='', max_length=255, verbose_name='Имя заявителя'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='booking',
            name='requester_phone',
            field=models.CharField(blank=True, default='', max_length=20, verbose_name='Телефон заявителя'),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='booking',
            name='client',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bookings', to='clients.client', verbose_name='Клиент'),
        ),
        migrations.AlterField(
            model_name='booking',
            name='status',
            field=models.CharField(choices=[('pending', 'На согласовании'), ('confirmed', 'Подтверждена'), ('completed', 'Выполнена'), ('canceled', 'Отменена')], default='pending', max_length=20, verbose_name='Статус'),
        ),
    ]
