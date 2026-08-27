from datetime import datetime, timedelta
from django.db.models import Sum, Count, F, Q, DecimalField
from django.db.models.functions import TruncMonth
from django.utils import timezone
from decimal import Decimal, InvalidOperation
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.users.permissions import HasCapability
from apps.tasks.models import Task
from apps.booking.models import Booking
from apps.production.models import Production
from apps.media_plan.models import Publication
from apps.payments.models import Payment, PlannedPayment
from apps.clients.models import Client
from apps.client_portal.models import MaterialApproval
from apps.contacts.models import Contact
from apps.files.models import ProjectFile
from apps.chat.models import Message
from apps.helpdesk.models import HelpdeskTicket
from apps.projects.models import Project


def build_status_counts(queryset, field_name, order, labels):
    counts = {
        item[field_name]: item['count']
        for item in queryset.values(field_name).annotate(count=Count('id'))
    }
    return [
        {
            'status': status,
            'label': labels[status],
            'count': counts.get(status, 0),
        }
        for status in order
    ]


class WorkdayView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        now = timezone.now()
        today = timezone.localdate()
        week_end = today + timedelta(days=7)

        tasks = Task.objects.filter(
            due_date__lt=now,
            is_archived=False,
        ).exclude(status__in=[Task.STATUS_DONE, Task.STATUS_CANCELED]).select_related('project', 'client')
        if not user.has_capability('tasks.manage'):
            tasks = tasks.filter(Q(assignees=user) | Q(members=user)).distinct()

        approvals = MaterialApproval.objects.filter(status=MaterialApproval.STATUS_PENDING).select_related('client', 'project')
        if not user.has_capability('approvals.manage'):
            approvals = approvals.filter(submitted_by=user)

        tickets = HelpdeskTicket.objects.exclude(status=HelpdeskTicket.STATUS_CLOSED).select_related('assignee')
        if not user.has_capability('helpdesk.manage'):
            tickets = tickets.filter(assignee=user)

        bookings = Booking.objects.none()
        if user.has_capability('bookings.view'):
            bookings = Booking.objects.filter(
                start_time__date__gte=today,
                start_time__date__lte=week_end,
            ).exclude(status=Booking.STATUS_CANCELED).select_related('client', 'service')

        payments = PlannedPayment.objects.none()
        if user.has_capability('finance.view'):
            payments = PlannedPayment.objects.filter(
                status=PlannedPayment.STATUS_SCHEDULED,
                due_date__lte=week_end,
            ).select_related('plan')
            if not user.has_capability('finance.manage'):
                payments = payments.filter(plan__responsible=user)

        return Response({
            'date': today.isoformat(),
            'overdue_tasks': [{
                'id': item.id,
                'title': item.title,
                'due_date': item.due_date,
                'project': item.project.name if item.project else '',
                'client': item.client.name if item.client else '',
                'priority': item.priority,
                'href': '/tasks',
            } for item in tasks.order_by('due_date')[:12]],
            'approvals': [{
                'id': item.id,
                'title': item.title,
                'client': item.client.name,
                'project': item.project.name if item.project else '',
                'due_date': item.due_date,
                'href': '/approvals',
            } for item in approvals.order_by('due_date', 'created_at')[:12]],
            'tickets': [{
                'id': item.id,
                'title': item.subject,
                'requester': item.requester_name,
                'priority': item.priority,
                'status': item.status,
                'href': '/helpdesk',
            } for item in tickets.order_by('-priority', 'created_at')[:12]],
            'bookings': [{
                'id': item.id,
                'title': item.service.name,
                'client': item.contact_name,
                'start_time': item.start_time,
                'status': item.status,
                'href': '/bookings',
            } for item in bookings.order_by('start_time')[:12]],
            'payments': [{
                'id': item.id,
                'title': item.plan.title,
                'counterparty': item.plan.counterparty,
                'amount': float(item.amount),
                'due_date': item.due_date,
                'is_overdue': item.due_date < today,
                'href': '/payment-calendar',
            } for item in payments.order_by('due_date')[:12]],
        })


class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if len(query) < 2:
            return Response({'query': query, 'groups': []})

        user = request.user
        groups = []

        def add_group(key, label, items):
            items = list(items)
            if items:
                groups.append({'key': key, 'label': label, 'items': items})

        if user.has_capability('clients.view'):
            phone_fragment = ''.join(char for char in query if char.isdigit())[-4:]
            client_filter = (
                Q(name__icontains=query) | Q(phone__icontains=query) |
                Q(email__icontains=query) | Q(telegram__icontains=query)
            )
            contact_filter = (
                Q(full_name__icontains=query) | Q(phone__icontains=query) |
                Q(email__icontains=query) | Q(organization__icontains=query)
            )
            if len(phone_fragment) == 4:
                client_filter |= Q(phone__icontains=phone_fragment)
                contact_filter |= Q(phone__icontains=phone_fragment)
            clients = Client.objects.filter(client_filter).filter(is_archived=False)[:6]
            add_group('clients', 'Клиенты', ({'id': x.id, 'title': x.name, 'subtitle': x.phone or x.email, 'href': '/clients'} for x in clients))

            contacts = Contact.objects.filter(contact_filter)[:6]
            add_group('contacts', 'Контакты', ({'id': x.id, 'title': x.full_name, 'subtitle': x.organization or x.phone, 'href': '/contacts'} for x in contacts))

        if user.has_capability('projects.view'):
            projects = Project.objects.filter(Q(name__icontains=query) | Q(description__icontains=query), is_archived=False)
            if not user.has_capability('projects.manage'):
                projects = projects.filter(members=user)
            add_group('projects', 'Проекты', ({'id': x.id, 'title': x.name, 'subtitle': x.description[:90], 'href': '/projects'} for x in projects[:6]))

        if user.has_capability('tasks.view'):
            tasks = Task.objects.filter(Q(title__icontains=query) | Q(description__icontains=query), is_archived=False).select_related('project')
            if not user.has_capability('tasks.manage'):
                tasks = tasks.filter(Q(assignees=user) | Q(members=user)).distinct()
            add_group('tasks', 'Задачи', ({'id': x.id, 'title': x.title, 'subtitle': x.project.name if x.project else x.get_status_display(), 'href': '/tasks'} for x in tasks[:6]))

        if user.has_capability('files.view'):
            files = ProjectFile.objects.filter(Q(name__icontains=query) | Q(description__icontains=query)).select_related('project')
            if not user.has_capability('files.manage'):
                files = files.filter(project__members=user)
            add_group('files', 'Файлы', ({'id': x.id, 'title': x.name, 'subtitle': x.project.name, 'href': x.file.url} for x in files[:6]))

        if user.has_capability('finance.view'):
            payment_filter = Q(bank_order_id__icontains=query) | Q(booking__client__name__icontains=query)
            try:
                payment_filter |= Q(amount=Decimal(query.replace(',', '.').replace(' ', '')))
            except (InvalidOperation, ValueError):
                pass
            payments = Payment.objects.filter(payment_filter).select_related('booking__client', 'booking__service')[:6]
            add_group('payments', 'Платежи', ({
                'id': x.id,
                'title': f'{x.amount:,.0f} ₽',
                'subtitle': x.booking.contact_name,
                'href': '/payments',
            } for x in payments))

        if user.has_capability('chat.view'):
            messages = Message.objects.filter(
                Q(text__icontains=query) | Q(transcription__icontains=query),
                chat__members=user,
            ).select_related('sender', 'chat').distinct().order_by('-created_at')[:6]
            add_group('messages', 'Сообщения', ({
                'id': x.id,
                'title': x.text[:100] or x.transcription[:100],
                'subtitle': x.sender.get_short_name(),
                'href': '/chat',
            } for x in messages))

        return Response({'query': query, 'groups': groups})


class DashboardStatsView(APIView):
    permission_classes = [HasCapability]
    required_capability = 'finance.view'

    def get(self, request):
        now = timezone.now()
        year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

        tasks_by_status = build_status_counts(
            Task.objects.filter(is_archived=False),
            'status',
            [
                Task.STATUS_NEW,
                Task.STATUS_IN_PROGRESS,
                Task.STATUS_APPROVAL,
                Task.STATUS_REVIEW,
                Task.STATUS_CONTENT_PLACEMENT,
                Task.STATUS_DONE,
                Task.STATUS_CANCELED,
            ],
            dict(Task.STATUS_CHOICES),
        )

        productions_by_status = build_status_counts(
            Production.objects.all(),
            'status',
            [
                Production.STATUS_NEW,
                Production.STATUS_SHOOTING,
                Production.STATUS_EDITING,
                Production.STATUS_REVIEW,
                Production.STATUS_CORRECTIONS,
                Production.STATUS_SENT_TO_CLIENT,
            ],
            dict(Production.STATUS_CHOICES),
        )

        publications_by_status = build_status_counts(
            Publication.objects.all(),
            'status',
            [
                Publication.STATUS_DRAFT,
                Publication.STATUS_APPROVAL,
                Publication.STATUS_SCHEDULED,
                Publication.STATUS_PUBLISHED,
                Publication.STATUS_CANCELLED,
            ],
            dict(Publication.STATUS_CHOICES),
        )

        bookings_by_status = list(
            Booking.objects.values('status')
            .annotate(count=Count('id'))
            .order_by('status')
        )

        revenue_by_month = list(
            Payment.objects.filter(
                status=Payment.STATUS_SUCCESS,
                created_at__gte=year_start,
            )
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(total=Sum('amount'))
            .order_by('month')
        )
        for item in revenue_by_month:
            item['month'] = item['month'].strftime('%Y-%m')
            item['total'] = float(item['total'])

        top_services = list(
            Payment.objects.filter(status=Payment.STATUS_SUCCESS)
            .values('booking__service__name')
            .annotate(total=Sum('amount'))
            .order_by('-total')[:5]
        )
        for item in top_services:
            item['total'] = float(item['total'])

        deadline_threshold = now + timedelta(days=3)
        upcoming_deadlines_qs = (
            Task.objects.filter(
                is_archived=False,
                due_date__isnull=False,
                due_date__lte=deadline_threshold,
                due_date__gte=now,
            )
            .exclude(status__in=['done', 'canceled'])
            .order_by('due_date')
            .prefetch_related('assignees')[:10]
        )
        upcoming_deadlines = [
            {
                'id': t.id,
                'title': t.title,
                'due_date': t.due_date,
                'status': t.status,
                'assignees': [
                    {'id': u.id, 'first_name': u.first_name, 'username': u.username}
                    for u in t.assignees.all()
                ],
            }
            for t in upcoming_deadlines_qs
        ]

        debtors = list(
            Booking.objects.filter(
                Q(paid_amount__lt=F('service__price')) | Q(paid_amount=0))
            .order_by('-start_time')
            .values(
                'id', 'client__name', 'service__name', 'service__price',
                'paid_amount', 'start_time'
            )[:10]
        )
        for item in debtors:
            item['remaining_amount'] = float(item['service__price'] - item['paid_amount'])
            item['service__price'] = float(item['service__price'])
            item['paid_amount'] = float(item['paid_amount'])

        total_paid = Payment.objects.filter(status=Payment.STATUS_SUCCESS).aggregate(
            total=Sum('amount')
        )['total'] or 0
        total_pending = Payment.objects.filter(status=Payment.STATUS_PENDING).aggregate(
            total=Sum('amount')
        )['total'] or 0
        total_debt = sum(d['remaining_amount'] for d in debtors)
        total_clients = Client.objects.filter(is_archived=False).count()

        return Response({
            'tasks_by_status': tasks_by_status,
            'productions_by_status': productions_by_status,
            'publications_by_status': publications_by_status,
            'bookings_by_status': bookings_by_status,
            'revenue_by_month': revenue_by_month,
            'top_services': top_services,
            'upcoming_deadlines': upcoming_deadlines,
            'debtors': debtors,
            'totals': {
                'paid': float(total_paid),
                'pending': float(total_pending),
                'debt': float(total_debt),
                'clients': total_clients,
            },
        })


class FinanceReportView(APIView):
    permission_classes = [HasCapability]
    required_capability = 'finance.view'

    def get(self, request):
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')

        payments = Payment.objects.filter(status=Payment.STATUS_SUCCESS)
        if from_date:
            payments = payments.filter(created_at__date__gte=from_date)
        if to_date:
            payments = payments.filter(created_at__date__lte=to_date)

        total_paid = payments.aggregate(total=Sum('amount'))['total'] or 0

        by_month = list(
            payments.annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('month')
        )
        for item in by_month:
            item['month'] = item['month'].strftime('%Y-%m')
            item['total'] = float(item['total'])

        by_client = list(
            payments.values('booking__client__name')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('-total')
        )
        for item in by_client:
            item['total'] = float(item['total'])

        by_service = list(
            payments.values('booking__service__name')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('-total')
        )
        for item in by_service:
            item['total'] = float(item['total'])

        unpaid = list(
            Booking.objects.filter(
                Q(paid_amount__lt=F('service__price')) | Q(paid_amount=0))
            .order_by('-start_time')
            .values(
                'id', 'client__name', 'service__name', 'service__price',
                'paid_amount', 'start_time', 'status'
            )
        )
        for item in unpaid:
            item['remaining_amount'] = float(item['service__price'] - item['paid_amount'])
            item['service__price'] = float(item['service__price'])
            item['paid_amount'] = float(item['paid_amount'])

        return Response({
            'period': {'from': from_date, 'to': to_date},
            'total_paid': float(total_paid),
            'by_month': by_month,
            'by_client': by_client,
            'by_service': by_service,
            'unpaid': unpaid,
        })
