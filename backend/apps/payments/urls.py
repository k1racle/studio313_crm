from django.urls import path

from .views import (
    PaymentCalendarSummaryView,
    PaymentByOrderView,
    PaymentCallbackView,
    PaymentDetailView,
    PaymentListCreateView,
    PaymentReceiptView,
    PaymentSendLinkView,
    PaymentSettingsView,
    PaymentPlanDetailView,
    PaymentPlanListCreateView,
    PlannedPaymentListView,
    PlannedPaymentMemoView,
    PlannedPaymentStatusView,
    PaymentStatusView,
    PublicPaymentCreateView,
    PublicPaymentStatusView,
)

urlpatterns = [
    path('calendar/plans/', PaymentPlanListCreateView.as_view(), name='payment_plan_list_create'),
    path('calendar/plans/<int:pk>/', PaymentPlanDetailView.as_view(), name='payment_plan_detail'),
    path('calendar/occurrences/', PlannedPaymentListView.as_view(), name='planned_payment_list'),
    path('calendar/occurrences/<int:pk>/status/', PlannedPaymentStatusView.as_view(), name='planned_payment_status'),
    path('calendar/occurrences/<int:pk>/memo/', PlannedPaymentMemoView.as_view(), name='planned_payment_memo'),
    path('calendar/summary/', PaymentCalendarSummaryView.as_view(), name='payment_calendar_summary'),
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
