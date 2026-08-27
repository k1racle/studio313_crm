from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import ClientAccessToken, MaterialApproval
from .serializers import ClientAccessTokenSerializer, MaterialApprovalResponseSerializer, MaterialApprovalSerializer
from apps.users.permissions import IsManagerOrHigher
from apps.clients.models import Client


class ClientAccessTokenListCreateView(generics.ListCreateAPIView):
    serializer_class = ClientAccessTokenSerializer
    permission_classes = [IsManagerOrHigher]

    def get_queryset(self):
        return ClientAccessToken.objects.filter(is_active=True)

    def perform_create(self, serializer):
        serializer.save()


class ClientAccessTokenDetailView(generics.RetrieveDestroyAPIView):
    queryset = ClientAccessToken.objects.all()
    serializer_class = ClientAccessTokenSerializer
    permission_classes = [IsManagerOrHigher]


class MaterialApprovalListCreateView(generics.ListCreateAPIView):
    serializer_class = MaterialApprovalSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    pagination_class = None

    def get_queryset(self):
        qs = MaterialApproval.objects.select_related('client', 'project', 'production', 'submitted_by')
        status_value = self.request.query_params.get('status')
        if status_value:
            qs = qs.filter(status=status_value)
        if self.request.user.has_capability('approvals.manage'):
            return qs
        return qs.filter(submitted_by=self.request.user)

    def perform_create(self, serializer):
        if not self.request.user.has_capability('approvals.manage'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Недостаточно прав для отправки материалов')
        serializer.save(submitted_by=self.request.user)


class MaterialApprovalDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MaterialApprovalSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        qs = MaterialApproval.objects.select_related('client', 'project', 'production', 'submitted_by')
        if self.request.user.has_capability('approvals.manage'):
            return qs
        return qs.filter(submitted_by=self.request.user)


class MaterialApprovalOptionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.has_capability('approvals.manage'):
            return Response({'detail': 'Недостаточно прав'}, status=status.HTTP_403_FORBIDDEN)
        from apps.projects.models import Project
        from apps.production.models import Production
        clients = Client.objects.filter(is_archived=False).order_by('name').values('id', 'name')
        projects = Project.objects.filter(is_archived=False).order_by('name').values('id', 'name')
        productions = Production.objects.exclude(status=Production.STATUS_SENT_TO_CLIENT).order_by('-updated_at').values('id', 'title', 'client_id', 'project_id')
        return Response({
            'clients': list(clients),
            'projects': list(projects),
            'productions': list(productions),
        })


class ClientPortalView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        access_token = get_object_or_404(ClientAccessToken, token=token, is_active=True)
        if access_token.is_expired():
            return Response({'detail': 'Ссылка устарела'}, status=status.HTTP_403_FORBIDDEN)

        client = access_token.client
        bookings = list(
            client.bookings.all().order_by('-start_time').values(
                'id', 'service__name', 'start_time', 'end_time', 'status',
                'service__price', 'paid_amount', 'notes'
            )
        )
        for b in bookings:
            b['remaining_amount'] = float(b['service__price'] - b['paid_amount'])
            b['service__price'] = float(b['service__price'])
            b['paid_amount'] = float(b['paid_amount'])

        from apps.payments.models import Payment
        payments = list(
            Payment.objects.filter(booking__client=client)
            .order_by('-created_at')
            .values(
                'id', 'amount', 'status', 'created_at',
                'booking__service__name', 'bank_order_id'
            )
        )
        for p in payments:
            p['amount'] = float(p['amount'])

        tasks = list(
            client.tasks.filter(is_archived=False).order_by('-created_at').values(
                'id', 'title', 'status', 'priority', 'due_date', 'project__name'
            )
        )

        approvals = MaterialApprovalSerializer(
            client.material_approvals.select_related('project', 'production', 'submitted_by'),
            many=True,
            context={'request': request},
        ).data

        return Response({
            'client': {
                'id': client.id,
                'name': client.name,
                'phone': client.phone,
                'email': client.email,
                'telegram': client.telegram,
                'notes': client.notes,
            },
            'bookings': bookings,
            'payments': payments,
            'tasks': tasks,
            'approvals': approvals,
        })


class ClientApprovalResponseView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, token, pk):
        access_token = get_object_or_404(ClientAccessToken, token=token, is_active=True)
        if access_token.is_expired():
            return Response({'detail': 'Ссылка устарела'}, status=status.HTTP_403_FORBIDDEN)
        approval = get_object_or_404(MaterialApproval, pk=pk, client=access_token.client)
        serializer = MaterialApprovalResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        approval.status = serializer.validated_data['status']
        approval.client_comment = serializer.validated_data.get('comment', '').strip()
        approval.responded_at = timezone.now()
        approval.save(update_fields=['status', 'client_comment', 'responded_at', 'updated_at'])
        return Response(MaterialApprovalSerializer(approval, context={'request': request}).data)
