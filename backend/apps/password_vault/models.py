from django.conf import settings
from django.db import models


class PasswordVaultCategory(models.TextChoices):
    IT = 'it', 'IT пароли'
    SOCIAL = 'social', 'Соцсети'
    EMAIL = 'email', 'Почта'


class PasswordVaultPermission(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='password_vault_permissions',
        verbose_name='Сотрудник',
    )
    category = models.CharField(max_length=20, choices=PasswordVaultCategory.choices, verbose_name='Категория')
    can_view = models.BooleanField(default=False, verbose_name='Просмотр')
    can_add = models.BooleanField(default=False, verbose_name='Добавление')
    can_change = models.BooleanField(default=False, verbose_name='Изменение')
    can_delete = models.BooleanField(default=False, verbose_name='Удаление')

    class Meta:
        verbose_name = 'Право на категорию хранилища'
        verbose_name_plural = 'Права на категории хранилища'
        unique_together = [('user', 'category')]
        ordering = ['user__last_name', 'user__first_name', 'category']

    def __str__(self):
        return f'{self.user} - {self.get_category_display()}'


class PasswordVaultEntry(models.Model):
    category = models.CharField(max_length=20, choices=PasswordVaultCategory.choices, verbose_name='Категория')
    title = models.CharField(max_length=255, verbose_name='Название')
    login = models.CharField(max_length=255, blank=True, verbose_name='Логин')
    password = models.TextField(verbose_name='Пароль')
    url = models.URLField(blank=True, verbose_name='Ссылка')
    notes = models.TextField(blank=True, verbose_name='Комментарий')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='password_vault_entries_created',
        verbose_name='Создал',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='password_vault_entries_updated',
        verbose_name='Изменил',
    )
    shared_with = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='PasswordVaultEntryAccess',
        related_name='shared_password_vault_entries',
        verbose_name='Доступ у сотрудников',
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлено')

    class Meta:
        verbose_name = 'Запись хранилища'
        verbose_name_plural = 'Записи хранилища'
        ordering = ['category', 'title', '-updated_at']

    def __str__(self):
        return f'{self.get_category_display()}: {self.title}'


class PasswordVaultEntryAccess(models.Model):
    entry = models.ForeignKey(
        PasswordVaultEntry,
        on_delete=models.CASCADE,
        related_name='access_grants',
        verbose_name='Запись',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='password_vault_access_grants',
        verbose_name='Сотрудник',
    )
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='password_vault_grants_created',
        verbose_name='Выдал доступ',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Выдано')

    class Meta:
        verbose_name = 'Выданный доступ к записи'
        verbose_name_plural = 'Выданные доступы к записям'
        unique_together = [('entry', 'user')]
        ordering = ['user__last_name', 'user__first_name']

    def __str__(self):
        return f'{self.user} -> {self.entry}'

