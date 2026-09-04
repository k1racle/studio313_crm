import logging

from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.services import create_in_app_notification
from apps.tasks.models import Task
from apps.users.models import User
from apps.users.permissions import IsManagerOrHigher
from .models import HelpdeskTicket
from .serializers import (
    HelpdeskTicketSerializer,
    PublicHelpdeskTicketSerializer,
    TicketCommentSerializer,
)

logger = logging.getLogger(__name__)


def notify_new_ticket(ticket):
    managers = User.objects.filter(
        Q(role__in=[User.ROLE_MANAGER, User.ROLE_DIRECTOR, User.ROLE_ADMIN])
        | Q(is_staff=True)
        | Q(is_superuser=True)
    ).distinct()
    for manager in managers:
        try:
            create_in_app_notification(
                user=manager,
                title='Новое обращение',
                message=f'#{ticket.id}: {ticket.subject} от {ticket.requester_name}',
                link='/helpdesk',
            )
        except Exception:
            logger.exception('Failed to notify manager %s about helpdesk ticket %s', manager.pk, ticket.pk)


class HelpdeskTicketListCreateView(generics.ListCreateAPIView):
    serializer_class = HelpdeskTicketSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'priority', 'source', 'category', 'assignee']
    search_fields = ['subject', 'description', 'requester_name', 'requester_contact']

    def get_queryset(self):
        if self.request.user.has_capability('helpdesk.manage'):
            return HelpdeskTicket.objects.all()
        return HelpdeskTicket.objects.filter(assignee=self.request.user)

    def perform_create(self, serializer):
        ticket = serializer.save()
        notify_new_ticket(ticket)
        return ticket


class HelpdeskTicketDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = HelpdeskTicket.objects.all()
    serializer_class = HelpdeskTicketSerializer
    permission_classes = [IsManagerOrHigher]


class TicketCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = TicketCommentSerializer

    def get_queryset(self):
        return HelpdeskTicket.objects.get(pk=self.kwargs['ticket_pk']).comments.all()

    def perform_create(self, serializer):
        ticket = HelpdeskTicket.objects.get(pk=self.kwargs['ticket_pk'])
        serializer.save(ticket=ticket, author=self.request.user)


class PublicTicketCreateView(generics.CreateAPIView):
    queryset = HelpdeskTicket.objects.all()
    serializer_class = PublicHelpdeskTicketSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        ticket = serializer.save(source=HelpdeskTicket.SOURCE_FORM, status=HelpdeskTicket.STATUS_OPEN)
        notify_new_ticket(ticket)
        return ticket


class ConvertTicketToTaskView(APIView):
    permission_classes = [IsManagerOrHigher]

    def post(self, request, pk):
        try:
            ticket = HelpdeskTicket.objects.get(pk=pk)
        except HelpdeskTicket.DoesNotExist:
            return Response({'detail': 'Тикет не найден'}, status=status.HTTP_404_NOT_FOUND)

        task = Task.objects.create(
            title=f'Обращение #{ticket.id}: {ticket.subject}',
            description=ticket.description,
            source=Task.SOURCE_HELPDESK,
            priority=ticket.priority,
            assignee=ticket.assignee,
        )
        ticket.status = HelpdeskTicket.STATUS_CLOSED
        ticket.save()
        return Response({'task_id': task.id, 'title': task.title}, status=status.HTTP_201_CREATED)
