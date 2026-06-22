from rest_framework import serializers
from .models import Project
from apps.users.serializers import UserSerializer


class ProjectSerializer(serializers.ModelSerializer):
    members = UserSerializer(many=True, read_only=True)
    member_ids = serializers.PrimaryKeyRelatedField(
        source='members',
        queryset=Project._meta.get_field('members').related_model.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )

    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'members', 'member_ids', 'is_active', 'is_archived', 'created_at']
        read_only_fields = ['created_at']
