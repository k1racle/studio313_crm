from django.contrib import admin
from .models import Service, Booking


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'duration_minutes', 'price', 'is_active']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['client', 'service', 'start_time', 'status']
    list_filter = ['status', 'service', 'start_time']
