from rest_framework import serializers
from .models import Production, ProductionComment, ProductionAttachment, ProductionSubTask
from apps.clients.models import Client
from apps.users.serializers import UserSerializer
from apps.projects.serializers import ProjectSerializer


class ClientMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id', 'name', 'phone']


class ProductionAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductionAttachment
        fields = ['id', 'file', 'uploaded_at']
        read_only_fields = ['uploaded_at']


class ProductionSubTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductionSubTask
        fields = ['id', 'title', 'is_done', 'order', 'created_at']
        read_only_fields = ['created_at']


class ProductionCommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = ProductionComment
        fields = ['id', 'production', 'author', 'text', 'created_at']
        read_only_fields = ['production', 'author']


class ProductionSerializer(serializers.ModelSerializer):
    creator = UserSerializer(read_only=True)
    assignees = UserSerializer(many=True, read_only=True)
    assignee_ids = serializers.PrimaryKeyRelatedField(
        source='assignees',
        queryset=Production._meta.get_field('assignees').related_model.objects.all(),
        many=True,
        required=False,
        write_only=True,
    )
    project = ProjectSerializer(read_only=True)
    project_id = serializers.PrimaryKeyRelatedField(
        source='project',
        queryset=Production._meta.get_field('project').related_model.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )
    client = ClientMiniSerializer(read_only=True)
    client_id = serializers.PrimaryKeyRelatedField(
        source='client',
        queryset=Client.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )
    comments = ProductionCommentSerializer(many=True, read_only=True)
    attachments = ProductionAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Production
        fields = [
            'id', 'title', 'description', 'status',
            'project', 'project_id',
            'client', 'client_id',
            'creator', 'assignees', 'assignee_ids', 'due_date',
            'comments', 'attachments', 'subtasks',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['creator', 'created_at', 'updated_at']
