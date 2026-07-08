from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import PublicationViewSet, PublicationAttachmentDeleteView, PlatformListView


router = DefaultRouter()
router.register('publications', PublicationViewSet, basename='publication')

urlpatterns = router.urls + [
    path('platforms/', PlatformListView.as_view(), name='platform-list'),
    path('attachments/<int:pk>/', PublicationAttachmentDeleteView.as_view(), name='publication-attachment-delete'),
]
