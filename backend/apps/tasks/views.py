from datetime import timedelta
from django.utils import timezone
from django.http import HttpResponse
from openpyxl import Workbook
from rest_framework import generics, permissions, filters, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from config.export_utils import filter_queryset_from_view
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


class TaskExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = filter_queryset_from_view(request, TaskListCreateView)
        qs = qs.select_related('project', 'client', 'creator').prefetch_related('assignees', 'members', 'tags')

        wb = Workbook()
        ws = wb.active
        ws.title = 'Задачи'
        ws.append([
            'ID', 'Название', 'Описание', 'Статус', 'Приоритет', 'Источник',
            'Проект', 'Клиент', 'Исполнители', 'Участники', 'Теги',
            'Срок', 'В архиве', 'Создано', 'Обновлено',
        ])
        for task in qs:
            ws.append([
                task.id,
                task.title,
                task.description or '',
                task.get_status_display(),
                task.get_priority_display(),
                task.get_source_display() if task.source else '—',
                task.project.name if task.project else '—',
                task.client.name if task.client else '—',
                ', '.join(u.get_full_name() or u.username for u in task.assignees.all()),
                ', '.join(u.get_full_name() or u.username for u in task.members.all()),
                ', '.join(t.name for t in task.tags.all()),
                task.due_date.strftime('%d.%m.%Y') if task.due_date else '—',
                'Да' if task.is_archived else 'Нет',
                task.created_at.strftime('%d.%m.%Y %H:%M'),
                task.updated_at.strftime('%d.%m.%Y %H:%M'),
            ])

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="tasks.xlsx"'
        wb.save(response)
        return response


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
