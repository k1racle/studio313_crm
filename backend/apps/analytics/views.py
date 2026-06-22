from datetime import datetime, timedelta
from django.db.models import Sum, Count, F, Q, DecimalField
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.users.permissions import IsManagerOrHigher
from apps.tasks.models import Task
from apps.booking.models import Booking
from apps.payments.models import Payment
from apps.clients.models import Client


class DashboardStatsView(APIView):
    permission_classes = [IsManagerOrHigher]

    def get(self, request):
        now = timezone.now()
        year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

        tasks_by_status = list(
            Task.objects.filter(is_archived=False)
            .values('status')
            .annotate(count=Count('id'))
            .order_by('status')
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
        upcoming_deadlines = list(
            Task.objects.filter(
                is_archived=False,
                due_date__isnull=False,
                due_date__lte=deadline_threshold,
                due_date__gte=now,
            )
            .exclude(status__in=['done', 'canceled'])
            .order_by('due_date')
            .values('id', 'title', 'due_date', 'status', 'assignee__first_name', 'assignee__username')[:10]
        )

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

        return Response({
            'tasks_by_status': tasks_by_status,
            'bookings_by_status': bookings_by_status,
            'revenue_by_month': revenue_by_month,
            'top_services': top_services,
            'upcoming_deadlines': upcoming_deadlines,
            'debtors': debtors,
            'totals': {
                'paid': float(total_paid),
                'pending': float(total_pending),
                'debt': float(total_debt),
            },
        })


class FinanceReportView(APIView):
    permission_classes = [IsManagerOrHigher]

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
