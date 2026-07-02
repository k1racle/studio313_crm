from django.contrib import admin
from .models import Contact


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'organization', 'position', 'phone', 'email', 'created_at']
    list_filter = ['organization']
    search_fields = ['full_name', 'organization', 'position', 'phone', 'email', 'notes']
