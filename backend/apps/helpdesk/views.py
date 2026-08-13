import logging

from django.db.models import Q
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.services import create_in_app_notification
from apps.tasks.models import Task
from apps.users.models import User
from apps.users.permissions import IsManagerOrHigher
from .models import HelpdeskTicket
from .serializers import HelpdeskTicketSerializer, TicketCommentSerializer

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


@method_decorator(xframe_options_exempt, name='dispatch')
class HelpdeskWidgetView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        html = '''<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Связаться со студией</title>
<style>
  :root {
    --bg: #f3f6fb;
    --panel: #ffffff;
    --line: #d7deea;
    --text: #0e1730;
    --muted: #5d677b;
    --primary: #1d6fff;
    --primary-dark: #1657cd;
    --success-bg: #eafbf0;
    --success-text: #176a43;
    --error-bg: #fff1f1;
    --error-text: #aa2d2d;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: var(--text);
    font-family: Inter, "Segoe UI", Arial, sans-serif;
    background:
      linear-gradient(180deg, rgba(29,111,255,0.06), transparent 240px),
      var(--bg);
  }
  .widget {
    max-width: 1160px;
    margin: 0 auto;
    padding: 28px 28px 36px;
  }
  .hero {
    margin-bottom: 22px;
  }
  .hero h1 {
    margin: 0;
    font-size: clamp(36px, 5vw, 68px);
    line-height: 0.92;
    text-transform: uppercase;
    letter-spacing: -0.06em;
    font-weight: 900;
  }
  .hero-bar {
    width: min(74%, 760px);
    height: 22px;
    margin-top: 8px;
    background: var(--primary);
  }
  .layout {
    display: grid;
    gap: 18px;
  }
  .section {
    border: 1px solid var(--line);
    background: var(--panel);
    padding: 20px;
  }
  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .step {
    display: inline-flex;
    width: 38px;
    height: 38px;
    align-items: center;
    justify-content: center;
    background: var(--primary);
    color: white;
    font-size: 15px;
    font-weight: 900;
  }
  .section-title {
    margin: 0;
    font-size: 20px;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: -0.04em;
    font-weight: 900;
  }
  .section-note {
    margin: -2px 0 18px;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.55;
    max-width: 720px;
  }
  .field-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .field-wide {
    grid-column: 1 / -1;
  }
  label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    font-weight: 700;
  }
  input, textarea {
    width: 100%;
    min-height: 56px;
    border: 1px solid var(--line);
    padding: 14px 16px;
    font-size: 16px;
    color: var(--text);
    background: #fff;
    outline: none;
    transition: 160ms ease;
  }
  textarea {
    min-height: 140px;
    resize: vertical;
  }
  input:focus, textarea:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(29,111,255,0.12);
  }
  .submit-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-top: 18px;
  }
  .summary {
    font-size: 14px;
    color: var(--muted);
  }
  .submit {
    min-width: 280px;
    min-height: 58px;
    border: 0;
    background: var(--primary);
    color: #fff;
    font-size: 16px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 900;
    cursor: pointer;
    transition: 160ms ease;
  }
  .submit:hover {
    background: var(--primary-dark);
  }
  .message {
    display: none;
    margin-top: 16px;
    padding: 14px 16px;
    font-size: 14px;
  }
  .message.success {
    display: block;
    background: var(--success-bg);
    color: var(--success-text);
  }
  .message.error {
    display: block;
    background: var(--error-bg);
    color: var(--error-text);
  }
  @media (max-width: 920px) {
    .widget {
      padding: 18px;
    }
    .hero-bar {
      width: 78%;
      height: 16px;
    }
    .field-grid {
      grid-template-columns: 1fr;
    }
    .submit-row {
      flex-direction: column;
      align-items: stretch;
    }
    .submit {
      min-width: 0;
      width: 100%;
    }
  }
</style>
</head>
<body>
<div class="widget">
  <div class="hero">
    <h1>Связаться со студией</h1>
    <div class="hero-bar"></div>
  </div>

  <form id="ticketForm">
    <div class="layout">
      <section class="section">
        <div class="section-header">
          <div class="step">01</div>
          <h2 class="section-title">Ваши контакты</h2>
        </div>
        <p class="section-note">Оставьте контакты и коротко опишите задачу. Мы быстро вернёмся с уточнениями и предложим решение.</p>
        <div class="field-grid">
          <div class="field">
            <label for="requesterName">Имя</label>
            <input id="requesterName" type="text" name="requester_name" placeholder="Как к вам обращаться" required>
          </div>
          <div class="field">
            <label for="requesterContact">Контакт</label>
            <input id="requesterContact" type="text" name="requester_contact" placeholder="Телефон, email, Telegram" required>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <div class="step">02</div>
          <h2 class="section-title">Что нужно сделать</h2>
        </div>
        <div class="field-grid">
          <div class="field field-wide">
            <label for="subject">Тема</label>
            <input id="subject" type="text" name="subject" placeholder="Например: нужна запись подкаста на следующей неделе" required>
          </div>
          <div class="field field-wide">
            <label for="description">Описание</label>
            <textarea id="description" name="description" placeholder="Опишите задачу, формат, дедлайн, количество участников и всё, что важно знать заранее" required></textarea>
          </div>
        </div>
        <div class="submit-row">
          <div class="summary">После отправки обращение сразу попадёт менеджерам в CRM.</div>
          <button class="submit" type="submit">Отправить запрос</button>
        </div>
      </section>
    </div>
  </form>

  <div id="message" class="message"></div>
</div>

<script>
  const messageNode = document.getElementById('message');

  document.getElementById('ticketForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {};
    new FormData(e.target).forEach((value, key) => {
      body[key] = value;
    });

    try {
      const res = await fetch('/api/helpdesk/public/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      messageNode.className = `message ${res.ok ? 'success' : 'error'}`;
      messageNode.textContent = res.ok
        ? 'Обращение отправлено. Менеджер свяжется с вами в ближайшее время.'
        : JSON.stringify(data);

      if (res.ok) {
        e.target.reset();
      }
    } catch (error) {
      messageNode.className = 'message error';
      messageNode.textContent = error.message;
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
