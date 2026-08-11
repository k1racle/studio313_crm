from django.contrib import admin

from .models import PasswordVaultEntry, PasswordVaultEntryAccess, PasswordVaultPermission


@admin.register(PasswordVaultPermission)
class PasswordVaultPermissionAdmin(admin.ModelAdmin):
    list_display = ['user', 'category', 'can_view', 'can_add', 'can_change', 'can_delete']
    list_filter = ['category', 'can_view', 'can_add', 'can_change', 'can_delete']
    search_fields = ['user__username', 'user__first_name', 'user__last_name']
    autocomplete_fields = ['user']


class PasswordVaultEntryAccessInline(admin.TabularInline):
    model = PasswordVaultEntryAccess
    extra = 0
    autocomplete_fields = ['user', 'granted_by']


@admin.register(PasswordVaultEntry)
class PasswordVaultEntryAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'login', 'created_by', 'updated_by', 'updated_at']
    list_filter = ['category']
    search_fields = ['title', 'login', 'url', 'notes']
    autocomplete_fields = ['created_by', 'updated_by']
    inlines = [PasswordVaultEntryAccessInline]
