from django.db import migrations


ROLE_TEMPLATES = [
    ('manager', 'Менеджер', 'Клиенты, проекты и ежедневные операции', [
        'tasks.view', 'tasks.manage', 'production.view', 'production.manage',
        'media_plan.view', 'media_plan.manage', 'approvals.view', 'approvals.manage',
        'clients.view', 'clients.manage', 'projects.view', 'projects.manage',
        'bookings.view', 'bookings.manage', 'files.view', 'files.manage',
        'finance.view', 'helpdesk.view', 'helpdesk.manage', 'chat.view',
        'knowledge.view', 'timesheets.view', 'team.manage',
    ]),
    ('producer', 'Продюсер', 'Проекты, продакшен и согласования', [
        'tasks.view', 'tasks.manage', 'production.view', 'production.manage',
        'media_plan.view', 'media_plan.manage', 'approvals.view', 'approvals.manage',
        'clients.view', 'projects.view', 'projects.manage', 'bookings.view',
        'files.view', 'files.manage', 'finance.view', 'helpdesk.view',
        'chat.view', 'knowledge.view', 'timesheets.view',
    ]),
    ('accountant', 'Бухгалтер', 'Платежи, финансовые планы и клиенты', [
        'clients.view', 'projects.view', 'bookings.view', 'files.view',
        'finance.view', 'finance.manage', 'approvals.view', 'chat.view',
        'knowledge.view', 'timesheets.view',
    ]),
    ('operator', 'Оператор', 'Съёмки, задачи и рабочие файлы', [
        'tasks.view', 'production.view', 'projects.view', 'files.view',
        'files.manage', 'chat.view', 'knowledge.view', 'timesheets.view',
    ]),
    ('editor', 'Монтажёр', 'Монтаж, правки и рабочие файлы', [
        'tasks.view', 'production.view', 'projects.view', 'files.view',
        'files.manage', 'approvals.view', 'chat.view', 'knowledge.view',
        'timesheets.view',
    ]),
    ('client', 'Клиент', 'Доступ только к клиентскому порталу', []),
]


def seed_roles(apps, schema_editor):
    RoleProfile = apps.get_model('users', 'RoleProfile')
    for slug, name, description, permissions in ROLE_TEMPLATES:
        RoleProfile.objects.update_or_create(
            slug=slug,
            defaults={
                'name': name,
                'description': description,
                'permissions': permissions,
                'is_system': True,
            },
        )


def remove_roles(apps, schema_editor):
    RoleProfile = apps.get_model('users', 'RoleProfile')
    RoleProfile.objects.filter(slug__in=[item[0] for item in ROLE_TEMPLATES], is_system=True).delete()


class Migration(migrations.Migration):
    dependencies = [('users', '0006_roleprofile_user_custom_role')]

    operations = [migrations.RunPython(seed_roles, remove_roles)]
