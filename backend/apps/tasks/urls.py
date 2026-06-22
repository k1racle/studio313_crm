from django.urls import path
from .views import (
    TaskListCreateView, TaskDetailView,
    TaskCommentListCreateView, TaskAttachmentListCreateView,
    TaskAttachmentDeleteView
)

urlpatterns = [
    path('', TaskListCreateView.as_view(), name='task_list_create'),
    path('<int:pk>/', TaskDetailView.as_view(), name='task_detail'),
    path('<int:task_pk>/comments/', TaskCommentListCreateView.as_view(), name='task_comments'),
    path('<int:task_pk>/attachments/', TaskAttachmentListCreateView.as_view(), name='task_attachments'),
    path('attachments/<int:pk>/', TaskAttachmentDeleteView.as_view(), name='task_attachment_delete'),
]
