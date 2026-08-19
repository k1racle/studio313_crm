from django.urls import path

from .views import (
    PaymentByOrderView,
    PaymentCallbackView,
    PaymentDetailView,
    PaymentListCreateView,
    PaymentReceiptView,
    PaymentSendLinkView,
    PaymentSettingsView,
    PaymentStatusView,
    PublicPaymentCreateView,
    PublicPaymentStatusView,
)

urlpatterns = [
    path('', PaymentListCreateView.as_view(), name='payment_list_create'),
    path('public/', PublicPaymentCreateView.as_view(), name='public_payment_create'),
    path('public-status/', PublicPaymentStatusView.as_view(), name='public_payment_status'),
    path('callback/', PaymentCallbackView.as_view(), name='payment_callback'),
    path('by-order/', PaymentByOrderView.as_view(), name='payment_by_order'),
    path('settings/', PaymentSettingsView.as_view(), name='payment_settings'),
    path('<int:pk>/', PaymentDetailView.as_view(), name='payment_detail'),
    path('<int:pk>/status/', PaymentStatusView.as_view(), name='payment_status'),
    path('<int:pk>/send/', PaymentSendLinkView.as_view(), name='payment_send_link'),
    path('<int:pk>/receipt/', PaymentReceiptView.as_view(), name='payment_receipt'),
]
