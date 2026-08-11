from django.db.models import Q

from .models import PasswordVaultCategory, PasswordVaultPermission


VAULT_ACTIONS = ('view', 'add', 'change', 'delete')


def empty_permission_map():
    return {
        category: {action: False for action in VAULT_ACTIONS}
        for category in PasswordVaultCategory.values
    }


def build_user_permission_map(user):
    permission_map = empty_permission_map()
    if not user or not user.is_authenticated:
        return permission_map
    if user.is_admin:
        return {
            category: {action: True for action in VAULT_ACTIONS}
            for category in PasswordVaultCategory.values
        }

    for item in PasswordVaultPermission.objects.filter(user=user):
        permission_map[item.category] = {
            'view': item.can_view,
            'add': item.can_add,
            'change': item.can_change,
            'delete': item.can_delete,
        }
    return permission_map


def has_category_permission(user, category, action):
    if not user or not user.is_authenticated:
        return False
    if user.is_admin:
        return True
    permission_map = build_user_permission_map(user)
    return permission_map.get(category, {}).get(action, False)


def has_entry_access(user, entry):
    if not user or not user.is_authenticated:
        return False
    if user.is_admin:
        return True
    if entry.created_by_id == user.id:
        return True
    return entry.shared_with.filter(pk=user.id).exists()


def has_entry_permission(user, entry, action):
    return has_category_permission(user, entry.category, action) and has_entry_access(user, entry)


def get_visible_entries_queryset(queryset, user):
    if user.is_admin:
        return queryset

    allowed_categories = [
        category
        for category, actions in build_user_permission_map(user).items()
        if actions.get('view')
    ]
    if not allowed_categories:
        return queryset.none()

    return queryset.filter(
        category__in=allowed_categories
    ).filter(
        Q(created_by=user) | Q(shared_with=user)
    ).distinct()

