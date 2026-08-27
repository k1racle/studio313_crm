from django.urls import path
from .views import DashboardStatsView, FinanceReportView, GlobalSearchView, WorkdayView

urlpatterns = [
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('finance/', FinanceReportView.as_view(), name='finance_report'),
    path('workday/', WorkdayView.as_view(), name='workday'),
    path('search/', GlobalSearchView.as_view(), name='global_search'),
]
