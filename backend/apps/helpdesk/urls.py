from django.urls import path
from .views import (
    HelpdeskTicketListCreateView, HelpdeskTicketDetailView,
    TicketCommentListCreateView, PublicTicketCreateView,
    ConvertTicketToTaskView, HelpdeskWidgetView
)

urlpatterns = [
    path('', HelpdeskTicketListCreateView.as_view(), name='ticket_list_create'),
    path('<int:pk>/', HelpdeskTicketDetailView.as_view(), name='ticket_detail'),
    path('<int:pk>/convert/', ConvertTicketToTaskView.as_view(), name='ticket_convert'),
    path('<int:ticket_pk>/comments/', TicketCommentListCreateView.as_view(), name='ticket_comments'),
    path('public/', PublicTicketCreateView.as_view(), name='public_ticket_create'),
    path('widget/', HelpdeskWidgetView.as_view(), name='helpdesk_widget'),
]
