from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import ClientAccessToken
from .serializers import ClientAccessTokenSerializer
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
        })
