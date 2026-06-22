from django.db import models
from django.core.exceptions import ValidationError
from apps.booking.models import Booking


class Payment(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_SUCCESS = 'success'
    STATUS_FAILED = 'failed'
    STATUS_CANCELED = 'canceled'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'В ожидании'),
        (STATUS_SUCCESS, 'Успешно'),
        (STATUS_FAILED, 'Ошибка'),
        (STATUS_CANCELED, 'Отменён'),
    ]

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='payments', verbose_name='Запись')
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Сумма')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, verbose_name='Статус')
    transaction_id = models.CharField(max_length=255, blank=True, verbose_name='ID транзакции')
    payment_url = models.URLField(blank=True, verbose_name='Ссылка на оплату')
    bank_order_id = models.CharField(max_length=255, blank=True, verbose_name='Номер заказа в банке')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлён')

    class Meta:
        verbose_name = 'Платёж'
        verbose_name_plural = 'Платежи'
        ordering = ['-created_at']

    def __str__(self):
        return f'Платёж #{self.id} — {self.amount}'


class PaymentSettings(models.Model):
    test_mode = models.BooleanField(default=True, verbose_name='Тестовый режим')
    username = models.CharField(max_length=255, blank=True, verbose_name='Логин терминала')
    password = models.CharField(max_length=255, blank=True, verbose_name='Пароль терминала')
    token = models.CharField(max_length=255, blank=True, verbose_name='Токен')
    base_url = models.URLField(default='https://pay.alfabank.ru/rest/', verbose_name='Базовый URL АПИ')

    class Meta:
        verbose_name = 'Настройка оплаты'
        verbose_name_plural = 'Настройки оплаты'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
