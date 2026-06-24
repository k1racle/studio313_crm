from rest_framework import serializers
from .models import Task, TaskComment, TaskAttachment
from apps.clients.models import Client
from apps.users.serializers import UserSerializer
from apps.projects.serializers import ProjectSerializer
from apps.tags.models import Tag
from apps.tags.serializers import TagSerializer


class ClientMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id', 'name', 'phone']


class TaskAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskAttachment
        fields = ['id', 'file', 'uploaded_at']
        read_only_fields = ['uploaded_at']


class TaskCommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = TaskComment
        fields = ['id', 'task', 'author', 'text', 'created_at']
        read_only_fields = ['task', 'author']


class TaskSerializer(serializers.ModelSerializer):
    creator = UserSerializer(read_only=True)
    assignee = UserSerializer(read_only=True)
    assignee_id = serializers.PrimaryKeyRelatedField(
        source='assignee',
        queryset=Task._meta.get_field('assignee').related_model.objects.all(),
        required=False,
        allow_null=True,
        write_only=True
    )
    project = ProjectSerializer(read_only=True)
    project_id = serializers.PrimaryKeyRelatedField(
        source='project',
        queryset=Task._meta.get_field('project').related_model.objects.all(),
        required=False,
        allow_null=True,
        write_only=True
    )
    client = ClientMiniSerializer(read_only=True)
    client_id = serializers.PrimaryKeyRelatedField(
        source='client',
        queryset=Client.objects.all(),
        required=False,
        allow_null=True,
        write_only=True
    )
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        source='tags',
        queryset=Tag.objects.all(),
        many=True,
        required=False,
        write_only=True
    )
    comments = TaskCommentSerializer(many=True, read_only=True)
    attachments = TaskAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 'priority', 'source',
            'project', 'project_id',
            'client', 'client_id',
            'creator', 'assignee', 'assignee_id', 'due_date',
            'is_archived',
            'tags', 'tag_ids',
            'created_at', 'updated_at', 'comments', 'attachments'
        ]
        read_only_fields = ['creator', 'source', 'created_at', 'updated_at']
