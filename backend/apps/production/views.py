from django.http import HttpResponse
from openpyxl import Workbook
from rest_framework import generics, filters
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from config.export_utils import filter_queryset_from_view
from .models import Production, ProductionComment, ProductionAttachment
from .serializers import (
    ProductionSerializer,
    ProductionCommentSerializer,
    ProductionAttachmentSerializer,
)


class ProductionListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductionSerializer
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'assignees', 'project', 'client']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'due_date']

    def get_queryset(self):
        user = self.request.user
        qs = Production.objects.all()
        if user.is_manager:
            return qs
        return qs.filter(assignees=user)

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)


class ProductionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_manager:
            return Production.objects.all()
        return Production.objects.filter(assignees=user)


class ProductionExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = filter_queryset_from_view(request, ProductionListCreateView)
        qs = qs.select_related('project', 'client', 'creator').prefetch_related('assignees')

        wb = Workbook()
        ws = wb.active
        ws.title = 'Производство'
        ws.append([
            'ID', 'Название', 'Описание', 'Статус',
            'Проект', 'Клиент', 'Исполнители', 'Срок', 'Создано', 'Обновлено',
        ])
        for item in qs:
            ws.append([
                item.id,
                item.title,
                item.description or '',
                item.get_status_display(),
                item.project.name if item.project else '—',
                item.client.name if item.client else '—',
                ', '.join(u.get_full_name() or u.username for u in item.assignees.all()),
                item.due_date.strftime('%d.%m.%Y') if item.due_date else '—',
                item.created_at.strftime('%d.%m.%Y %H:%M'),
                item.updated_at.strftime('%d.%m.%Y %H:%M'),
            ])

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="production.xlsx"'
        wb.save(response)
        return response


class ProductionCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductionCommentSerializer

    def get_queryset(self):
        return Production.objects.get(pk=self.kwargs['production_pk']).comments.all()

    def perform_create(self, serializer):
        production = Production.objects.get(pk=self.kwargs['production_pk'])
        serializer.save(production=production, author=self.request.user)


class ProductionAttachmentListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductionAttachmentSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Production.objects.get(pk=self.kwargs['production_pk']).attachments.all()

    def perform_create(self, serializer):
        production = Production.objects.get(pk=self.kwargs['production_pk'])
        serializer.save(production=production)


class ProductionAttachmentDeleteView(generics.DestroyAPIView):
    queryset = ProductionAttachment.objects.all()
    serializer_class = ProductionAttachmentSerializer
