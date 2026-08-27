from datetime import timedelta
from django.utils import timezone
from rest_framework import generics, permissions
from django_filters.rest_framework import DjangoFilterBackend
from .models import Project
from .serializers import ProjectSerializer
from apps.users.permissions import IsManagerOrHigher


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_active']

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsManagerOrHigher()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = Project.objects.all()
        if self.request.query_params.get('archived') != '1':
            qs = qs.filter(is_archived=False)
        else:
            qs = qs.filter(is_archived=True, archived_at__gte=timezone.now() - timedelta(days=7))
        if user.has_capability('projects.manage'):
            return qs
        return qs.filter(members=user)


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        user = self.request.user
        if user.has_capability('projects.manage'):
            return Project.objects.all()
        return Project.objects.filter(members=user)

    def perform_update(self, serializer):
        instance = serializer.instance
        old_archived = instance.is_archived
        new_archived = serializer.validated_data.get('is_archived', old_archived)
        if new_archived and not old_archived:
            serializer.save(archived_at=timezone.now())
        elif not new_archived and old_archived:
            serializer.save(archived_at=None)
        else:
            serializer.save()
