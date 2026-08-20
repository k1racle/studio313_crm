from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('payments', '0003_yookassa_payment_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='PaymentPlan',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255, verbose_name='Название платежа')),
                ('counterparty', models.CharField(max_length=255, verbose_name='Получатель / контрагент')),
                ('purpose', models.TextField(verbose_name='Назначение платежа')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12, verbose_name='Сумма')),
                ('start_date', models.DateField(verbose_name='Первая дата оплаты')),
                ('frequency', models.CharField(choices=[('once', 'Разово'), ('weekly', 'Еженедельно'), ('monthly', 'Ежемесячно'), ('quarterly', 'Ежеквартально'), ('yearly', 'Ежегодно')], default='once', max_length=20, verbose_name='Периодичность')),
                ('end_date', models.DateField(blank=True, null=True, verbose_name='Повторять до')),
                ('reminder_days', models.PositiveSmallIntegerField(default=3, verbose_name='Напомнить за дней')),
                ('memo_recipient', models.CharField(default='ИП Батагову А.А.', max_length=255, verbose_name='Адресат служебной записки')),
                ('is_active', models.BooleanField(default=True, verbose_name='Активен')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создан')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Обновлен')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_payment_plans', to=settings.AUTH_USER_MODEL, verbose_name='Создал')),
                ('responsible', models.ManyToManyField(blank=True, related_name='responsible_payment_plans', to=settings.AUTH_USER_MODEL, verbose_name='Ответственные')),
            ],
            options={
                'verbose_name': 'План платежей',
                'verbose_name_plural': 'Планы платежей',
                'ordering': ['start_date', 'title'],
            },
        ),
        migrations.CreateModel(
            name='PlannedPayment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('due_date', models.DateField(verbose_name='Срок оплаты')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12, verbose_name='Сумма')),
                ('status', models.CharField(choices=[('scheduled', 'Запланирован'), ('paid', 'Оплачен'), ('skipped', 'Пропущен')], default='scheduled', max_length=20, verbose_name='Статус')),
                ('paid_at', models.DateTimeField(blank=True, null=True, verbose_name='Оплачен')),
                ('reminder_sent_at', models.DateTimeField(blank=True, null=True, verbose_name='Напоминание отправлено')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создан')),
                ('plan', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='occurrences', to='payments.paymentplan', verbose_name='План')),
            ],
            options={
                'verbose_name': 'Плановый платеж',
                'verbose_name_plural': 'Плановые платежи',
                'ordering': ['due_date', 'plan__title'],
            },
        ),
        migrations.AddConstraint(
            model_name='plannedpayment',
            constraint=models.UniqueConstraint(fields=('plan', 'due_date'), name='unique_planned_payment_date'),
        ),
    ]
