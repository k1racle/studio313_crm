from django.apps import AppConfig


class PasswordVaultConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.password_vault'
    verbose_name = 'Хранилище доступов'

