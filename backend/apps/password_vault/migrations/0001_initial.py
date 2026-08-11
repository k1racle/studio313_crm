from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PasswordVaultEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('category', models.CharField(choices=[('it', 'IT пароли'), ('social', 'Соцсети'), ('email', 'Почта')], max_length=20, verbose_name='Категория')),
                ('title', models.CharField(max_length=255, verbose_name='Название')),
                ('login', models.CharField(blank=True, max_length=255, verbose_name='Логин')),
                ('password', models.TextField(verbose_name='Пароль')),
                ('url', models.URLField(blank=True, verbose_name='Ссылка')),
                ('notes', models.TextField(blank=True, verbose_name='Комментарий')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создано')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Обновлено')),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='password_vault_entries_created', to=settings.AUTH_USER_MODEL, verbose_name='Создал')),
                ('updated_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='password_vault_entries_updated', to=settings.AUTH_USER_MODEL, verbose_name='Изменил')),
            ],
            options={
                'verbose_name': 'Запись хранилища',
                'verbose_name_plural': 'Записи хранилища',
                'ordering': ['category', 'title', '-updated_at'],
            },
        ),
        migrations.CreateModel(
            name='PasswordVaultPermission',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('category', models.CharField(choices=[('it', 'IT пароли'), ('social', 'Соцсети'), ('email', 'Почта')], max_length=20, verbose_name='Категория')),
                ('can_view', models.BooleanField(default=False, verbose_name='Просмотр')),
                ('can_add', models.BooleanField(default=False, verbose_name='Добавление')),
                ('can_change', models.BooleanField(default=False, verbose_name='Изменение')),
                ('can_delete', models.BooleanField(default=False, verbose_name='Удаление')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='password_vault_permissions', to=settings.AUTH_USER_MODEL, verbose_name='Сотрудник')),
            ],
            options={
                'verbose_name': 'Право на категорию хранилища',
                'verbose_name_plural': 'Права на категории хранилища',
                'ordering': ['user__last_name', 'user__first_name', 'category'],
                'unique_together': {('user', 'category')},
            },
        ),
        migrations.CreateModel(
            name='PasswordVaultEntryAccess',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Выдано')),
                ('entry', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='access_grants', to='password_vault.passwordvaultentry', verbose_name='Запись')),
                ('granted_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='password_vault_grants_created', to=settings.AUTH_USER_MODEL, verbose_name='Выдал доступ')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='password_vault_access_grants', to=settings.AUTH_USER_MODEL, verbose_name='Сотрудник')),
            ],
            options={
                'verbose_name': 'Выданный доступ к записи',
                'verbose_name_plural': 'Выданные доступы к записям',
                'ordering': ['user__last_name', 'user__first_name'],
                'unique_together': {('entry', 'user')},
            },
        ),
        migrations.AddField(
            model_name='passwordvaultentry',
            name='shared_with',
            field=models.ManyToManyField(blank=True, related_name='shared_password_vault_entries', through='password_vault.PasswordVaultEntryAccess', to=settings.AUTH_USER_MODEL, verbose_name='Доступ у сотрудников'),
        ),
    ]
