from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import PublicationViewSet, PublicationAttachmentDeleteView, PlatformListView, PublicationExportView


router = DefaultRouter()
router.register('publications', PublicationViewSet, basename='publication')

urlpatterns = [
    path('platforms/', PlatformListView.as_view(), name='platform-list'),
    path('publications/export/', PublicationExportView.as_view(), name='publication-export'),
] + router.urls + [
    path('attachments/<int:pk>/', PublicationAttachmentDeleteView.as_view(), name='publication-attachment-delete'),
]
