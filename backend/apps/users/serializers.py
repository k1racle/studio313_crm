from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    is_manager = serializers.BooleanField(read_only=True)
    is_director = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'telegram_id', 'avatar', 'is_manager', 'is_director']
        read_only_fields = ['id']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'telegram_id', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
