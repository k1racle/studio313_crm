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
        if user.is_manager:
            return qs
        return qs.filter(members=user)


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_manager:
            return Project.objects.all()
        return Project.objects.filter(members=user)
