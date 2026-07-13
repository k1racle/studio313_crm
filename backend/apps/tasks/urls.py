from django.urls import path
from .views import (
    TaskListCreateView, TaskDetailView,
    TaskCommentListCreateView, TaskAttachmentListCreateView,
    TaskAttachmentDeleteView, TaskExportView,
    TaskSubTaskListCreateView, TaskSubTaskDetailView,
)

urlpatterns = [
    path('export/', TaskExportView.as_view(), name='task_export'),
    path('', TaskListCreateView.as_view(), name='task_list_create'),
    path('<int:pk>/', TaskDetailView.as_view(), name='task_detail'),
    path('<int:task_pk>/subtasks/', TaskSubTaskListCreateView.as_view(), name='task_subtasks'),
    path('subtasks/<int:pk>/', TaskSubTaskDetailView.as_view(), name='task_subtask_detail'),
    path('<int:task_pk>/comments/', TaskCommentListCreateView.as_view(), name='task_comments'),
    path('<int:task_pk>/attachments/', TaskAttachmentListCreateView.as_view(), name='task_attachments'),
    path('attachments/<int:pk>/', TaskAttachmentDeleteView.as_view(), name='task_attachment_delete'),
]
