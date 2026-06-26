from rest_framework import viewsets, filters, permissions, mixins
from django_filters.rest_framework import DjangoFilterBackend
from .models import KnowledgeCategory, KnowledgeItem, Slide
from .serializers import (
    KnowledgeCategorySerializer,
    KnowledgeItemListSerializer,
    KnowledgeItemDetailSerializer,
    SlideSerializer,
)
from apps.users.permissions import IsManagerOrHigher


class SlideViewSet(mixins.CreateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    queryset = Slide.objects.all()
    serializer_class = SlideSerializer
    permission_classes = [IsManagerOrHigher]


class KnowledgeCategoryViewSet(viewsets.ModelViewSet):
    queryset = KnowledgeCategory.objects.all()
    serializer_class = KnowledgeCategorySerializer
    permission_classes = [IsManagerOrHigher]


class KnowledgeItemViewSet(viewsets.ModelViewSet):
    queryset = KnowledgeItem.objects.filter(is_published=True)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['kind', 'category']
    search_fields = ['title', 'description']
    ordering_fields = ['order', 'title', 'created_at']
    ordering = ['order', 'title']

    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return KnowledgeItemDetailSerializer
        return KnowledgeItemListSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsManagerOrHigher()]

    def get_queryset(self):
        if self.request.user.is_authenticated and getattr(self.request.user, 'is_manager', False):
            return KnowledgeItem.objects.all()
        return super().get_queryset()
