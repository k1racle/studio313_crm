from django.db import models

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
