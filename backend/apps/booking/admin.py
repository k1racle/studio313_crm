from django.contrib import admin
from .models import Service, Booking


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['position', 'name', 'duration_minutes', 'price', 'price_type', 'is_active']
    ordering = ['position', 'id']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['client', 'service', 'start_time', 'status']
    list_filter = ['status', 'service', 'start_time']
