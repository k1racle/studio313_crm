from django.urls import path
from .views import ContactListCreateView, ContactDetailView, ContactExportView

urlpatterns = [
    path('', ContactListCreateView.as_view(), name='contact_list_create'),
    path('export/', ContactExportView.as_view(), name='contact_export'),
    path('<int:pk>/', ContactDetailView.as_view(), name='contact_detail'),
]
