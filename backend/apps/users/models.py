from django.contrib.auth.models import AbstractUser
from django.db import models


PERMISSION_CATALOG = [
    ('tasks.view', 'Задачи', 'Просмотр задач'),
    ('tasks.manage', 'Задачи', 'Создание и изменение задач'),
    ('production.view', 'Продакшен', 'Просмотр производства'),
    ('production.manage', 'Продакшен', 'Управление производством'),
    ('media_plan.view', 'Контент', 'Просмотр медиаплана'),
    ('media_plan.manage', 'Контент', 'Управление медиапланом'),
    ('approvals.view', 'Согласования', 'Просмотр согласований'),
    ('approvals.manage', 'Согласования', 'Создание и управление согласованиями'),
    ('clients.view', 'Клиенты', 'Просмотр клиентов и контактов'),
    ('clients.manage', 'Клиенты', 'Изменение клиентов и контактов'),
    ('projects.view', 'Проекты', 'Просмотр проектов'),
    ('projects.manage', 'Проекты', 'Управление проектами'),
    ('bookings.view', 'Запись', 'Просмотр записей и услуг'),
    ('bookings.manage', 'Запись', 'Управление записями и услугами'),
    ('files.view', 'Файлы', 'Просмотр файлов'),
    ('files.manage', 'Файлы', 'Загрузка и изменение файлов'),
    ('finance.view', 'Финансы', 'Просмотр платежей и финансов'),
    ('finance.manage', 'Финансы', 'Управление платежами и финансовыми планами'),
    ('helpdesk.view', 'Поддержка', 'Просмотр обращений'),
    ('helpdesk.manage', 'Поддержка', 'Обработка обращений'),
    ('chat.view', 'Коммуникации', 'Доступ к внутренним чатам'),
    ('knowledge.view', 'База знаний', 'Просмотр базы знаний'),
    ('knowledge.manage', 'База знаний', 'Управление базой знаний'),
    ('timesheets.view', 'Учёт времени', 'Просмотр таймшитов'),
    ('timesheets.manage', 'Учёт времени', 'Управление таймшитами'),
    ('passwords.view', 'Доступы', 'Просмотр хранилища доступов'),
    ('integrations.manage', 'Система', 'Управление интеграциями'),
    ('team.manage', 'Система', 'Управление сотрудниками'),
    ('roles.manage', 'Система', 'Настройка ролей и прав'),
]

ALL_PERMISSION_CODES = {item[0] for item in PERMISSION_CATALOG}
BASE_STAFF_PERMISSIONS = {
    'tasks.view', 'production.view', 'projects.view', 'files.view',
    'chat.view', 'knowledge.view', 'timesheets.view',
}
MANAGER_PERMISSIONS = ALL_PERMISSION_CODES - {'roles.manage'}


class RoleProfile(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name='Название')
    slug = models.SlugField(max_length=100, unique=True, verbose_name='Код')
    description = models.CharField(max_length=255, blank=True, verbose_name='Описание')
    permissions = models.JSONField(default=list, blank=True, verbose_name='Права')
    is_system = models.BooleanField(default=False, verbose_name='Системная роль')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Роль'
        verbose_name_plural = 'Роли'
        ordering = ['name']

    def __str__(self):
        return self.name


class User(AbstractUser):
    ROLE_ADMIN = 'admin'
    ROLE_DIRECTOR = 'director'
    ROLE_MANAGER = 'manager'
    ROLE_JOURNALIST = 'journalist'
    ROLE_STAFF = 'staff'

    ROLE_CHOICES = [
        (ROLE_ADMIN, 'Администратор'),
        (ROLE_DIRECTOR, 'Руководитель'),
        (ROLE_MANAGER, 'Менеджер'),
        (ROLE_JOURNALIST, 'Журналист'),
        (ROLE_STAFF, 'Сотрудник'),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_STAFF,
        verbose_name='Роль'
    )
    position = models.CharField(max_length=150, blank=True, verbose_name='Должность')
    patronymic = models.CharField(max_length=150, blank=True, verbose_name='Отчество')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон')
    telegram_id = models.CharField(max_length=100, blank=True, verbose_name='Telegram ID')
    max_id = models.CharField(max_length=100, blank=True, verbose_name='MAX ID')
    avatar = models.ImageField(upload_to='avatars/', blank=True, verbose_name='Аватар')
    birth_date = models.DateField(null=True, blank=True, verbose_name='День рождения')
    custom_role = models.ForeignKey(
        RoleProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        verbose_name='Настраиваемая роль',
    )

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'

    def __str__(self):
        return f'{self.get_full_name() or self.username} ({self.get_role_display()})'

    def get_full_name(self):
        full_name = ' '.join(filter(None, [self.last_name, self.first_name, self.patronymic]))
        return full_name.strip() or self.username

    def get_short_name(self):
        last = self.last_name or ''
        first = f"{self.first_name[0]}." if self.first_name else ''
        patronymic = f"{self.patronymic[0]}." if self.patronymic else ''
        initials = (first + patronymic).strip()
        if last and initials:
            return f"{last} {initials}"
        return last or self.first_name or self.username

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

    @property
    def effective_permissions(self):
        if self.is_admin or self.role == self.ROLE_DIRECTOR:
            return sorted(ALL_PERMISSION_CODES)
        if self.custom_role_id:
            return sorted(set(self.custom_role.permissions or []) & ALL_PERMISSION_CODES)
        if self.role == self.ROLE_MANAGER:
            return sorted(MANAGER_PERMISSIONS)
        return sorted(BASE_STAFF_PERMISSIONS)

    def has_capability(self, code):
        return code in self.effective_permissions
