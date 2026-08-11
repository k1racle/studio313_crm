from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.password_vault.models import PasswordVaultPermission

from .models import User


class PasswordVaultPermissionInline(admin.TabularInline):
    model = PasswordVaultPermission
    extra = 0
    fields = ['category', 'can_view', 'can_add', 'can_change', 'can_delete']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'patronymic', 'position', 'role', 'phone', 'telegram_id', 'birth_date']
    list_filter = ['role', 'is_staff', 'is_active']
    inlines = [PasswordVaultPermissionInline]
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Дополнительно', {'fields': ('role', 'position', 'patronymic', 'phone', 'telegram_id', 'max_id', 'avatar', 'birth_date')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2'),
        }),
        ('Персональные данные', {'fields': ('last_name', 'first_name', 'patronymic')}),
        ('Дополнительно', {'fields': ('role', 'position', 'phone', 'telegram_id', 'max_id', 'birth_date')}),
    )
