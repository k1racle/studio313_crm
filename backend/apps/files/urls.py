from django.urls import path
from .views import (
    FileTreeView,
    FolderListCreateView,
    FolderDetailView,
    ProjectFileListCreateView,
    ProjectFileDetailView,
)

urlpatterns = [
    path('', FileTreeView.as_view(), name='file_tree'),
    path('folders/', FolderListCreateView.as_view(), name='folder_list_create'),
    path('folders/<int:pk>/', FolderDetailView.as_view(), name='folder_detail'),
    path('files/', ProjectFileListCreateView.as_view(), name='projectfile_list_create'),
    path('files/<int:pk>/', ProjectFileDetailView.as_view(), name='projectfile_detail'),
]
