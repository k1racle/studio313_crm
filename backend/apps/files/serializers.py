from rest_framework import serializers
from .models import FileFolder, ProjectFile, ProjectLink
from apps.users.serializers import UserSerializer


class ProjectFileSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)

    class Meta:
        model = ProjectFile
        fields = ['id', 'name', 'description', 'file', 'size', 'uploaded_by', 'uploaded_at', 'project', 'folder']
        read_only_fields = ['uploaded_by', 'uploaded_at', 'size']


class FolderSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    files = ProjectFileSerializer(many=True, read_only=True)
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = FileFolder
        fields = ['id', 'name', 'project', 'parent', 'children', 'files', 'created_by', 'created_at']
        read_only_fields = ['created_by', 'created_at']

    def get_children(self, obj):
        # Ограничиваем вложенность через prefetch; рекурсия на уровне сериализатора
        return FolderSerializer(obj.children.all(), many=True).data


class FolderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileFolder
        fields = ['id', 'name', 'project', 'parent']


class ProjectLinkSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = ProjectLink
        fields = ['id', 'name', 'url', 'project', 'folder', 'created_by', 'created_at']
        read_only_fields = ['created_by', 'created_at']


class FolderSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    files = ProjectFileSerializer(many=True, read_only=True)
    links = ProjectLinkSerializer(many=True, read_only=True)
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = FileFolder
        fields = ['id', 'name', 'project', 'parent', 'children', 'files', 'links', 'created_by', 'created_at']
        read_only_fields = ['created_by', 'created_at']

    def get_children(self, obj):
        return FolderSerializer(obj.children.all(), many=True).data


class ProjectTreeSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    folders = serializers.SerializerMethodField()
    files = serializers.SerializerMethodField()
    links = serializers.SerializerMethodField()

    def get_folders(self, obj):
        top_folders = obj.file_folders.filter(parent__isnull=True)
        return FolderSerializer(top_folders, many=True).data

    def get_files(self, obj):
        direct_files = obj.project_files.filter(folder__isnull=True)
        return ProjectFileSerializer(direct_files, many=True).data

    def get_links(self, obj):
        direct_links = obj.project_links.filter(folder__isnull=True)
        return ProjectLinkSerializer(direct_links, many=True).data
