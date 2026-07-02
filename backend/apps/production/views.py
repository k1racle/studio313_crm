from rest_framework import generics, filters
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
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
    filterset_fields = ['status', 'assignee', 'project', 'client']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'due_date']

    def get_queryset(self):
        user = self.request.user
        qs = Production.objects.all()
        if user.is_manager:
            return qs
        return qs.filter(assignee=user)

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)


class ProductionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_manager:
            return Production.objects.all()
        return Production.objects.filter(assignee=user)


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
