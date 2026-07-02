from django.urls import path
from .views import (
    ProductionListCreateView,
    ProductionDetailView,
    ProductionCommentListCreateView,
    ProductionAttachmentListCreateView,
    ProductionAttachmentDeleteView,
)

urlpatterns = [
    path('', ProductionListCreateView.as_view(), name='production_list_create'),
    path('<int:pk>/', ProductionDetailView.as_view(), name='production_detail'),
    path('<int:production_pk>/comments/', ProductionCommentListCreateView.as_view(), name='production_comments'),
    path('<int:production_pk>/attachments/', ProductionAttachmentListCreateView.as_view(), name='production_attachments'),
    path('attachments/<int:pk>/', ProductionAttachmentDeleteView.as_view(), name='production_attachment_delete'),
]
