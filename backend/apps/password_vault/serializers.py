from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import PasswordVaultCategory, PasswordVaultEntry, PasswordVaultEntryAccess
from .permissions import build_user_permission_map, has_entry_permission

User = get_user_model()


class PasswordVaultUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    short_name = serializers.SerializerMethodField()
    is_admin = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'full_name', 'short_name', 'role', 'is_admin']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_short_name(self, obj):
        return obj.get_short_name()


class PasswordVaultEntrySerializer(serializers.ModelSerializer):
    created_by = PasswordVaultUserSerializer(read_only=True)
    updated_by = PasswordVaultUserSerializer(read_only=True)
    shared_users = serializers.SerializerMethodField()
    shared_user_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
        required=False,
    )
    category_label = serializers.CharField(source='get_category_display', read_only=True)
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = PasswordVaultEntry
        fields = [
            'id',
            'category',
            'category_label',
            'title',
            'login',
            'password',
            'url',
            'notes',
            'created_by',
            'updated_by',
            'shared_users',
            'shared_user_ids',
            'can_edit',
            'can_delete',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'updated_by', 'shared_users', 'can_edit', 'can_delete', 'created_at', 'updated_at']

    def validate_category(self, value):
        if value not in PasswordVaultCategory.values:
            raise serializers.ValidationError('Неизвестная категория.')
        return value

    def validate_shared_user_ids(self, value):
        unique_ids = list(dict.fromkeys(value))
        valid_ids = set(User.objects.filter(id__in=unique_ids, is_active=True).values_list('id', flat=True))
        invalid_ids = [item for item in unique_ids if item not in valid_ids]
        if invalid_ids:
            raise serializers.ValidationError(f'Некоторые сотрудники не найдены: {invalid_ids}')
        return unique_ids

    def get_shared_users(self, obj):
        users = obj.shared_with.filter(is_active=True).order_by('last_name', 'first_name', 'username')
        return PasswordVaultUserSerializer(users, many=True).data

    def get_can_edit(self, obj):
        request = self.context.get('request')
        return has_entry_permission(request.user, obj, 'change') if request else False

    def get_can_delete(self, obj):
        request = self.context.get('request')
        return has_entry_permission(request.user, obj, 'delete') if request else False

    def create(self, validated_data):
        shared_user_ids = validated_data.pop('shared_user_ids', [])
        request = self.context['request']
        entry = PasswordVaultEntry.objects.create(
            **validated_data,
            created_by=request.user,
            updated_by=request.user,
        )
        self._set_shared_users(entry, shared_user_ids, request.user)
        return entry

    def update(self, instance, validated_data):
        shared_user_ids = validated_data.pop('shared_user_ids', None)
        request = self.context['request']
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.updated_by = request.user
        instance.save()
        if shared_user_ids is not None:
            self._set_shared_users(instance, shared_user_ids, request.user)
        return instance

    def _set_shared_users(self, entry, user_ids, granted_by):
        current_ids = set(entry.shared_with.values_list('id', flat=True))
        new_ids = set(user_ids)

        ids_to_remove = current_ids - new_ids
        if ids_to_remove:
            PasswordVaultEntryAccess.objects.filter(entry=entry, user_id__in=ids_to_remove).delete()

        ids_to_add = new_ids - current_ids
        for user_id in ids_to_add:
            PasswordVaultEntryAccess.objects.create(entry=entry, user_id=user_id, granted_by=granted_by)


class PasswordVaultPermissionUpdateSerializer(serializers.Serializer):
    permissions = serializers.DictField()

    def validate_permissions(self, value):
        normalized = {}
        for category in PasswordVaultCategory.values:
            item = value.get(category, {})
            can_add = bool(item.get('add', False))
            can_change = bool(item.get('change', False))
            can_delete = bool(item.get('delete', False))
            normalized[category] = {
                'view': bool(item.get('view', False)) or can_add or can_change or can_delete,
                'add': can_add,
                'change': can_change,
                'delete': can_delete,
            }
        return normalized


class PasswordVaultMetaSerializer(serializers.Serializer):
    categories = serializers.ListField()
    current_permissions = serializers.DictField()
    can_manage_permissions = serializers.BooleanField()
    users = PasswordVaultUserSerializer(many=True)
    permission_matrix = serializers.ListField(required=False)


def serialize_permission_row(user):
    return {
        'user': PasswordVaultUserSerializer(user).data,
        'permissions': build_user_permission_map(user),
    }
