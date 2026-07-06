from django.urls import path
from .views import ClientListCreateView, ClientDetailView, ClientExportView

urlpatterns = [
    path('', ClientListCreateView.as_view(), name='client_list_create'),
    path('export/', ClientExportView.as_view(), name='client_export'),
    path('<int:pk>/', ClientDetailView.as_view(), name='client_detail'),
]
