from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import PublicationViewSet, PublicationAttachmentDeleteView


router = DefaultRouter()
router.register('publications', PublicationViewSet, basename='publication')

urlpatterns = router.urls + [
    path('attachments/<int:pk>/', PublicationAttachmentDeleteView.as_view(), name='publication-attachment-delete'),
]
