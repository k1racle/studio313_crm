from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import Publication, PublicationAttachment
from .serializers import PublicationSerializer, PublicationAttachmentSerializer
from apps.tasks.models import Task


class PublicationViewSet(viewsets.ModelViewSet):
    queryset = Publication.objects.all().select_related('responsible', 'created_by', 'linked_task', 'project').prefetch_related('attachments')
    serializer_class = PublicationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['platform', 'status', 'priority', 'responsible', 'project']
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
            assignee=publication.responsible,
            status=Task.STATUS_NEW,
        )
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


class PublicationAttachmentDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        attachment = get_object_or_404(PublicationAttachment, pk=pk)
        attachment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
