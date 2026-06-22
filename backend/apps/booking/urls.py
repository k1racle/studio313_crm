from django.urls import path
from .views import (
    ServiceListCreateView, ServiceDetailView,
    BookingListCreateView, BookingDetailView,
    PublicBookingCreateView, BookingWidgetView
)

urlpatterns = [
    path('services/', ServiceListCreateView.as_view(), name='service_list_create'),
    path('services/<int:pk>/', ServiceDetailView.as_view(), name='service_detail'),
    path('', BookingListCreateView.as_view(), name='booking_list_create'),
    path('<int:pk>/', BookingDetailView.as_view(), name='booking_detail'),
    path('public/', PublicBookingCreateView.as_view(), name='public_booking_create'),
    path('widget/', BookingWidgetView.as_view(), name='booking_widget'),
]
