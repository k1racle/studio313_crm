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
    filterset_fields = ['status', 'priority', 'assignee', 'source', 'project']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'due_date', 'priority']

    def get_queryset(self):
        user = self.request.user
        qs = Task.objects.all()
        if self.request.query_params.get('archived') != '1':
            qs = qs.filter(is_archived=False)
        if user.is_manager:
            return qs
        return qs.filter(project__members=user)

    def perform_create(self, serializer):
        task = serializer.save(creator=self.request.user)
        if task.assignee and task.assignee != self.request.user:
            create_in_app_notification(
                user=task.assignee,
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
