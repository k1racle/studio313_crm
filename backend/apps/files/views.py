from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from apps.projects.models import Project
from .models import FileFolder, ProjectFile
from .serializers import (
    ProjectTreeSerializer,
    FolderCreateSerializer,
    ProjectFileSerializer,
)


class FileTreeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project')
        if project_id:
            projects = Project.objects.filter(pk=project_id)
        else:
            projects = Project.objects.all()
        projects = projects.prefetch_related(
            'file_folders__children',
            'file_folders__files',
            'project_files',
        )
        serializer = ProjectTreeSerializer(projects, many=True)
        return Response(serializer.data)


class FolderListCreateView(generics.ListCreateAPIView):
    queryset = FileFolder.objects.all()
    serializer_class = FolderCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class FolderDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = FileFolder.objects.all()
    serializer_class = FolderCreateSerializer
    permission_classes = [IsAuthenticated]


class ProjectFileListCreateView(generics.ListCreateAPIView):
    queryset = ProjectFile.objects.all()
    serializer_class = ProjectFileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class ProjectFileDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ProjectFile.objects.all()
    serializer_class = ProjectFileSerializer
    permission_classes = [IsAuthenticated]

    def get_parser_classes(self):
        if self.request and self.request.method in ('PUT', 'PATCH'):
            return [MultiPartParser, FormParser]
        return []

    def perform_update(self, serializer):
        instance = serializer.instance
        if 'file' in serializer.validated_data and not serializer.validated_data.get('name'):
            serializer.validated_data['name'] = instance.file.name
        serializer.save()
