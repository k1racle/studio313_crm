from rest_framework import serializers
from .models import ALL_PERMISSION_CODES, RoleProfile, User


class RoleProfileSerializer(serializers.ModelSerializer):
    users_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = RoleProfile
        fields = ['id', 'name', 'slug', 'description', 'permissions', 'is_system', 'users_count']
        read_only_fields = ['id', 'is_system', 'users_count']

    def validate_permissions(self, value):
        unknown = set(value) - ALL_PERMISSION_CODES
        if unknown:
            raise serializers.ValidationError(f'Неизвестные права: {", ".join(sorted(unknown))}')
        return sorted(set(value))


class UserSerializer(serializers.ModelSerializer):
    is_manager = serializers.BooleanField(read_only=True)
    is_director = serializers.BooleanField(read_only=True)
    capabilities = serializers.SerializerMethodField()
    custom_role_detail = RoleProfileSerializer(source='custom_role', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'patronymic', 'position', 'role', 'custom_role', 'custom_role_detail', 'capabilities', 'phone', 'telegram_id', 'max_id', 'avatar', 'birth_date', 'is_manager', 'is_director']
        read_only_fields = ['id']

    def get_capabilities(self, obj):
        return obj.effective_permissions


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'patronymic', 'position', 'role', 'custom_role', 'phone', 'telegram_id', 'max_id', 'birth_date', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
