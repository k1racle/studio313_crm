from django.http import HttpResponse
from openpyxl import Workbook
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from config.export_utils import filter_queryset_from_view
from .models import Publication, PublicationAttachment, Platform
from .serializers import PublicationSerializer, PublicationAttachmentSerializer, PlatformSerializer
from apps.tasks.models import Task


class PlatformListView(generics.ListAPIView):
    queryset = Platform.objects.all()
    serializer_class = PlatformSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


class PublicationViewSet(viewsets.ModelViewSet):
    queryset = Publication.objects.all().select_related('responsible', 'created_by', 'linked_task', 'project').prefetch_related('attachments', 'platforms')
    serializer_class = PublicationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['platforms', 'status', 'priority', 'responsible', 'project']
    search_fields = ['title', 'description']
    ordering_fields = ['publish_at', 'priority', 'created_at']


    def get_queryset(self):
        qs = super().get_queryset()
        start = self.request.query_params.get('start')
        end = self.request.query_params.get('end')
        if start:
            qs = qs.filter(publish_at__gte=start)
        if end:
            qs = qs.filter(publish_at__lte=end)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        if 'status' in serializer.validated_data and serializer.validated_data['status'] != serializer.instance.status:
            serializer.instance.reminder_sent_at = None
        serializer.save()

    @action(detail=True, methods=['post'])
    def create_task(self, request, pk=None):
        publication = self.get_object()
        task = Task.objects.create(
            title=f'Подготовить публикацию: {publication.title}',
            description=publication.description or '',
            due_date=publication.publish_at,
            creator=request.user,
            status=Task.STATUS_NEW,
        )
        if publication.responsible:
            task.assignees.add(publication.responsible)
        publication.linked_task = task
        publication.save(update_fields=['linked_task'])
        return Response({'id': task.id, 'title': task.title}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def add_attachment(self, request, pk=None):
        publication = self.get_object()
        file = request.FILES.get('file')
        caption = request.data.get('caption', '')
        if not file:
            return Response({'error': 'Не передан файл'}, status=status.HTTP_400_BAD_REQUEST)
        attachment = PublicationAttachment.objects.create(publication=publication, file=file, caption=caption)
        return Response(PublicationAttachmentSerializer(attachment).data, status=status.HTTP_201_CREATED)


class PublicationExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = filter_queryset_from_view(request, PublicationViewSet)
        qs = qs.select_related('responsible', 'created_by', 'linked_task', 'project').prefetch_related('platforms')

        wb = Workbook()
        ws = wb.active
        ws.title = 'Медиа-план'
        ws.append([
            'ID', 'Тема', 'Описание', 'Платформы', 'Статус', 'Приоритет',
            'Проект', 'Дата и время публикации', 'Ответственный',
            'Создал', 'Связанная задача', 'Создано', 'Обновлено',
        ])
        for pub in qs:
            ws.append([
                pub.id,
                pub.title,
                pub.description or '',
                ', '.join(pub.platforms.values_list('name', flat=True)),
                pub.get_status_display(),
                pub.get_priority_display(),
                pub.project.name if pub.project else '—',
                pub.publish_at.strftime('%d.%m.%Y %H:%M') if pub.publish_at else '—',
                pub.responsible.get_full_name() or pub.responsible.username if pub.responsible else '—',
                pub.created_by.get_full_name() or pub.created_by.username if pub.created_by else '—',
                f"#{pub.linked_task.id} {pub.linked_task.title}" if pub.linked_task else '—',
                pub.created_at.strftime('%d.%m.%Y %H:%M'),
                pub.updated_at.strftime('%d.%m.%Y %H:%M'),
            ])

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="media_plan.xlsx"'
        wb.save(response)
        return response


class PublicationAttachmentDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        attachment = get_object_or_404(PublicationAttachment, pk=pk)
        attachment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
