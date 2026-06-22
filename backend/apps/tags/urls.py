from django.urls import path
from .views import TagListCreateView, TagDetailView

urlpatterns = [
    path('', TagListCreateView.as_view(), name='tag_list_create'),
    path('<int:pk>/', TagDetailView.as_view(), name='tag_detail'),
]
