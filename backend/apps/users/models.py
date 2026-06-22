from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_ADMIN = 'admin'
    ROLE_DIRECTOR = 'director'
    ROLE_MANAGER = 'manager'
    ROLE_JOURNALIST = 'journalist'

    ROLE_CHOICES = [
        (ROLE_ADMIN, 'Администратор'),
        (ROLE_DIRECTOR, 'Руководитель'),
        (ROLE_MANAGER, 'Менеджер'),
        (ROLE_JOURNALIST, 'Журналист'),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_JOURNALIST,
        verbose_name='Роль'
    )
    phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон')
    telegram_id = models.CharField(max_length=100, blank=True, verbose_name='Telegram ID')
    avatar = models.ImageField(upload_to='avatars/', blank=True, verbose_name='Аватар')

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'

    def __str__(self):
        return f'{self.get_full_name() or self.username} ({self.get_role_display()})'

    @property
    def is_admin(self):
        return self.role == self.ROLE_ADMIN or self.is_superuser or self.is_staff

    @property
    def is_director(self):
        return self.role == self.ROLE_DIRECTOR or self.is_admin

    @property
    def is_manager(self):
        return self.role == self.ROLE_MANAGER or self.is_director

    @property
    def is_journalist(self):
        return self.role == self.ROLE_JOURNALIST
