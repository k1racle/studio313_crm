from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import KnowledgeCategoryViewSet, KnowledgeItemViewSet, SlideViewSet

router = DefaultRouter()
router.register('categories', KnowledgeCategoryViewSet, basename='knowledge-category')
router.register('items', KnowledgeItemViewSet, basename='knowledge-item')
router.register('slides', SlideViewSet, basename='knowledge-slide')

urlpatterns = [
    path('', include(router.urls)),
]
