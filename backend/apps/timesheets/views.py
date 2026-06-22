from rest_framework import generics, permissions
from django_filters.rest_framework import DjangoFilterBackend
from .models import TimeEntry
from .serializers import TimeEntrySerializer
from apps.users.permissions import IsManagerOrHigher


class TimeEntryListCreateView(generics.ListCreateAPIView):
    serializer_class = TimeEntrySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['task', 'user', 'start_time']

    def get_queryset(self):
        user = self.request.user
        if user.is_manager:
            return TimeEntry.objects.all()
        return TimeEntry.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TimeEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TimeEntrySerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_manager:
            return TimeEntry.objects.all()
        return TimeEntry.objects.filter(user=user)

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]
