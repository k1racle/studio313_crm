from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.http import HttpResponse
from .models import HelpdeskTicket
from .serializers import HelpdeskTicketSerializer, TicketCommentSerializer
from apps.users.permissions import IsManagerOrHigher
from apps.tasks.models import Task
from apps.notifications.services import create_in_app_notification
from apps.users.models import User


def notify_new_ticket(ticket):
    managers = User.objects.filter(is_manager=True)
    for manager in managers:
        create_in_app_notification(
            user=manager,
            title='Новое обращение',
            message=f'#{ticket.id}: {ticket.subject} от {ticket.requester_name}',
            link='/helpdesk',
        )


class HelpdeskTicketListCreateView(generics.ListCreateAPIView):
    serializer_class = HelpdeskTicketSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'priority', 'source', 'category', 'assignee']
    search_fields = ['subject', 'description', 'requester_name', 'requester_contact']

    def get_queryset(self):
        if self.request.user.is_manager:
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
    serializer_class = HelpdeskTicketSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        ticket = serializer.save(source=HelpdeskTicket.SOURCE_FORM, status=HelpdeskTicket.STATUS_OPEN)
        notify_new_ticket(ticket)
        return ticket


class HelpdeskWidgetView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        html = '''<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Обращение в поддержку</title>
<style>
  body { font-family: sans-serif; margin: 0; padding: 16px; background: #f9fafb; }
  .widget { max-width: 360px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .widget h3 { margin-top: 0; }
  .widget label { display: block; margin: 10px 0 4px; font-size: 14px; }
  .widget input, .widget textarea { width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #d1d5db; border-radius: 4px; }
  .widget button { width: 100%; margin-top: 15px; padding: 10px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; }
  .widget .success { color: #065f46; margin-top: 10px; }
  .widget .error { color: #b91c1c; margin-top: 10px; }
</style>
</head>
<body>
<div class="widget">
  <h3>Обращение в поддержку</h3>
  <form id="ticketForm">
    <label>Ваше имя</label>
    <input type="text" name="requester_name" required>
    <label>Контакт (телефон/email/Telegram)</label>
    <input type="text" name="requester_contact" required>
    <label>Тема</label>
    <input type="text" name="subject" required>
    <label>Описание</label>
    <textarea name="description" rows="4" required></textarea>
    <button type="submit">Отправить</button>
  </form>
  <div id="message"></div>
</div>
<script>
  document.getElementById('ticketForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = {};
    new FormData(form).forEach((v, k) => body[k] = v);
    try {
      const res = await fetch('/api/helpdesk/public/', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const data = await res.json();
      document.getElementById('message').className = res.ok ? 'success' : 'error';
      document.getElementById('message').textContent = res.ok ? 'Обращение отправлено! Мы скоро свяжемся с вами.' : JSON.stringify(data);
      if (res.ok) form.reset();
    } catch (err) {
      document.getElementById('message').className = 'error';
      document.getElementById('message').textContent = err.message;
    }
  });
</script>
</body>
</html>'''
        return HttpResponse(html)


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
