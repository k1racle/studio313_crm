from django.urls import path
from .views import ContactListCreateView, ContactDetailView

urlpatterns = [
    path('', ContactListCreateView.as_view(), name='contact_list_create'),
    path('<int:pk>/', ContactDetailView.as_view(), name='contact_detail'),
]
