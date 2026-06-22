from django.urls import path
from .views import (
    PaymentListCreateView, PaymentDetailView, PaymentCallbackView,
    PaymentStatusView, PaymentSettingsView, PaymentByOrderView, PaymentReceiptView,
)

urlpatterns = [
    path('', PaymentListCreateView.as_view(), name='payment_list_create'),
    path('<int:pk>/', PaymentDetailView.as_view(), name='payment_detail'),
    path('<int:pk>/status/', PaymentStatusView.as_view(), name='payment_status'),
    path('<int:pk>/receipt/', PaymentReceiptView.as_view(), name='payment_receipt'),
    path('callback/', PaymentCallbackView.as_view(), name='payment_callback'),
    path('by-order/', PaymentByOrderView.as_view(), name='payment_by_order'),
    path('settings/', PaymentSettingsView.as_view(), name='payment_settings'),
]
