from django.db import models

from apps.clients.models import Client


class Service(models.Model):
    PRICE_TYPE_HOURLY = 'hourly'
    PRICE_TYPE_FIXED = 'fixed'
    PRICE_TYPE_CHOICES = [
        (PRICE_TYPE_HOURLY, 'За час'),
        (PRICE_TYPE_FIXED, 'За услугу'),
    ]

    name = models.CharField(max_length=255, verbose_name='Название')
    description = models.TextField(blank=True, verbose_name='Описание')
    duration_minutes = models.PositiveIntegerField(default=60, verbose_name='Длительность (мин)')
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='Цена')
    price_type = models.CharField(
        max_length=16,
        choices=PRICE_TYPE_CHOICES,
        default=PRICE_TYPE_HOURLY,
        verbose_name='Тип цены',
    )
    is_active = models.BooleanField(default=True, verbose_name='Активна')
    position = models.PositiveIntegerField(default=0, db_index=True, verbose_name='Позиция')

    class Meta:
        verbose_name = 'Услуга'
        verbose_name_plural = 'Услуги'
        ordering = ['position', 'id']

    def __str__(self):
        return self.name


class Booking(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELED = 'canceled'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'На согласовании'),
        (STATUS_CONFIRMED, 'Подтверждена'),
        (STATUS_COMPLETED, 'Выполнена'),
        (STATUS_CANCELED, 'Отменена'),
    ]

    client = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings',
        verbose_name='Клиент',
    )
    requester_name = models.CharField(max_length=255, blank=True, verbose_name='Имя заявителя')
    requester_phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон заявителя')
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='bookings', verbose_name='Услуга')
    start_time = models.DateTimeField(verbose_name='Начало')
    end_time = models.DateTimeField(verbose_name='Окончание')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, verbose_name='Статус')
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='Оплачено')
    notes = models.TextField(blank=True, verbose_name='Примечания')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создана')

    class Meta:
        verbose_name = 'Запись'
        verbose_name_plural = 'Записи'
        ordering = ['-start_time']

    @property
    def contact_name(self):
        if self.client and self.client.name:
            return self.client.name
        return self.requester_name or 'Без имени'

    @property
    def contact_phone(self):
        if self.client and self.client.phone:
            return self.client.phone
        return self.requester_phone

    def __str__(self):
        return f'{self.service} - {self.contact_name} - {self.start_time}'
