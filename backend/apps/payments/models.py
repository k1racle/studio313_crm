from django.db import models
from django.conf import settings

from apps.booking.models import Booking


class Payment(models.Model):
    PROVIDER_YOOKASSA = 'yookassa'
    PROVIDER_CHOICES = [
        (PROVIDER_YOOKASSA, 'YooKassa'),
    ]

    STATUS_PENDING = 'pending'
    STATUS_SUCCESS = 'success'
    STATUS_FAILED = 'failed'
    STATUS_CANCELED = 'canceled'

    TYPE_PARTIAL = 'partial'
    TYPE_FULL = 'full'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'В ожидании'),
        (STATUS_SUCCESS, 'Успешно'),
        (STATUS_FAILED, 'Ошибка'),
        (STATUS_CANCELED, 'Отменен'),
    ]

    TYPE_CHOICES = [
        (TYPE_PARTIAL, 'Частичная оплата 50%'),
        (TYPE_FULL, 'Полная оплата'),
    ]

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='payments', verbose_name='Запись')
    provider = models.CharField(max_length=32, choices=PROVIDER_CHOICES, default=PROVIDER_YOOKASSA, verbose_name='Провайдер')
    payment_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_FULL, verbose_name='Тип оплаты')
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Сумма')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, verbose_name='Статус')
    transaction_id = models.CharField(max_length=255, blank=True, verbose_name='ID транзакции')
    payment_url = models.URLField(blank=True, verbose_name='Ссылка на оплату')
    bank_order_id = models.CharField(max_length=255, blank=True, verbose_name='Внешний идентификатор')
    email_sent_at = models.DateTimeField(null=True, blank=True, verbose_name='Ссылка отправлена')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлен')

    class Meta:
        verbose_name = 'Платеж'
        verbose_name_plural = 'Платежи'
        ordering = ['-created_at']

    def __str__(self):
        return f'Платеж #{self.id} - {self.amount}'


class PaymentSettings(models.Model):
    test_mode = models.BooleanField(default=True, verbose_name='Тестовый режим')
    username = models.CharField(max_length=255, blank=True, verbose_name='Shop ID YooKassa')
    password = models.CharField(max_length=255, blank=True, verbose_name='Secret key YooKassa')
    token = models.CharField(max_length=255, blank=True, verbose_name='Дополнительный токен')
    base_url = models.URLField(default='https://api.yookassa.ru/v3/', verbose_name='Базовый URL API')

    class Meta:
        verbose_name = 'Настройка оплаты'
        verbose_name_plural = 'Настройки оплаты'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        return None

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(pk=1, defaults={'base_url': 'https://api.yookassa.ru/v3/'})
        if not obj.base_url:
            obj.base_url = 'https://api.yookassa.ru/v3/'
            obj.save(update_fields=['base_url'])
        return obj


class PaymentPlan(models.Model):
    FREQUENCY_ONCE = 'once'
    FREQUENCY_WEEKLY = 'weekly'
    FREQUENCY_MONTHLY = 'monthly'
    FREQUENCY_QUARTERLY = 'quarterly'
    FREQUENCY_YEARLY = 'yearly'

    FREQUENCY_CHOICES = [
        (FREQUENCY_ONCE, 'Разово'),
        (FREQUENCY_WEEKLY, 'Еженедельно'),
        (FREQUENCY_MONTHLY, 'Ежемесячно'),
        (FREQUENCY_QUARTERLY, 'Ежеквартально'),
        (FREQUENCY_YEARLY, 'Ежегодно'),
    ]

    title = models.CharField(max_length=255, verbose_name='Название платежа')
    counterparty = models.CharField(max_length=255, verbose_name='Получатель / контрагент')
    purpose = models.TextField(verbose_name='Назначение платежа')
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Сумма')
    start_date = models.DateField(verbose_name='Первая дата оплаты')
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default=FREQUENCY_ONCE, verbose_name='Периодичность')
    end_date = models.DateField(null=True, blank=True, verbose_name='Повторять до')
    reminder_days = models.PositiveSmallIntegerField(default=3, verbose_name='Напомнить за дней')
    memo_recipient = models.CharField(max_length=255, default='ИП Батагову А.А.', verbose_name='Адресат служебной записки')
    responsible = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='responsible_payment_plans',
        verbose_name='Ответственные',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_payment_plans',
        verbose_name='Создал',
    )
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлен')

    class Meta:
        verbose_name = 'План платежей'
        verbose_name_plural = 'Планы платежей'
        ordering = ['start_date', 'title']

    def __str__(self):
        return f'{self.title} — {self.amount}'


class PlannedPayment(models.Model):
    STATUS_SCHEDULED = 'scheduled'
    STATUS_PAID = 'paid'
    STATUS_SKIPPED = 'skipped'

    STATUS_CHOICES = [
        (STATUS_SCHEDULED, 'Запланирован'),
        (STATUS_PAID, 'Оплачен'),
        (STATUS_SKIPPED, 'Пропущен'),
    ]

    plan = models.ForeignKey(PaymentPlan, on_delete=models.CASCADE, related_name='occurrences', verbose_name='План')
    due_date = models.DateField(verbose_name='Срок оплаты')
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Сумма')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SCHEDULED, verbose_name='Статус')
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name='Оплачен')
    reminder_sent_at = models.DateTimeField(null=True, blank=True, verbose_name='Напоминание отправлено')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')

    class Meta:
        verbose_name = 'Плановый платеж'
        verbose_name_plural = 'Плановые платежи'
        ordering = ['due_date', 'plan__title']
        constraints = [
            models.UniqueConstraint(fields=['plan', 'due_date'], name='unique_planned_payment_date'),
        ]

    def __str__(self):
        return f'{self.plan.title} — {self.due_date}'
