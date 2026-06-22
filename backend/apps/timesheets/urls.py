from django.urls import path
from .views import TimeEntryListCreateView, TimeEntryDetailView

urlpatterns = [
    path('', TimeEntryListCreateView.as_view(), name='timeentry_list_create'),
    path('<int:pk>/', TimeEntryDetailView.as_view(), name='timeentry_detail'),
]
