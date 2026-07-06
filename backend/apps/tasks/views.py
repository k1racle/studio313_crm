from datetime import timedelta
from django.utils import timezone
from rest_framework import generics, permissions, filters, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Task, TaskAttachment
from .serializers import TaskSerializer, TaskCommentSerializer, TaskAttachmentSerializer
from apps.users.permissions import IsManagerOrHigher
from apps.notifications.services import create_in_app_notification


class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'assignees', 'source', 'project']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'due_date', 'priority']

    def get_queryset(self):
        user = self.request.user
        qs = Task.objects.all()
        if self.request.query_params.get('archived') != '1':
            qs = qs.filter(is_archived=False)
        else:
            qs = qs.filter(is_archived=True, archived_at__gte=timezone.now() - timedelta(days=7))
        if user.is_manager:
            return qs
        return qs.filter(project__members=user)

    def perform_create(self, serializer):
        task = serializer.save(creator=self.request.user)
        for user in task.assignees.all():
            if user != self.request.user:
                create_in_app_notification(
                    user=user,
                    title='Новая задача',
                    message=f'Вам назначена задача «{task.title}»',
                    link=f'/tasks/{task.id}',
                )
        return task


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TaskSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_manager:
            return Task.objects.all()
        return Task.objects.filter(project__members=user)

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


class TaskCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskCommentSerializer

    def get_queryset(self):
        return Task.objects.get(pk=self.kwargs['task_pk']).comments.all()

    def perform_create(self, serializer):
        task = Task.objects.get(pk=self.kwargs['task_pk'])
        serializer.save(task=task, author=self.request.user)


class TaskAttachmentListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskAttachmentSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Task.objects.get(pk=self.kwargs['task_pk']).attachments.all()

    def perform_create(self, serializer):
        task = Task.objects.get(pk=self.kwargs['task_pk'])
        serializer.save(task=task)


class TaskAttachmentDeleteView(generics.DestroyAPIView):
    queryset = TaskAttachment.objects.all()
    serializer_class = TaskAttachmentSerializer
