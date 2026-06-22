from django.urls import path
from .views import DashboardStatsView, FinanceReportView

urlpatterns = [
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('finance/', FinanceReportView.as_view(), name='finance_report'),
]
