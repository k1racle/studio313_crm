from datetime import timedelta
from django.utils import timezone
from django.http import HttpResponse
from rest_framework import generics, filters
from rest_framework.views import APIView
from openpyxl import Workbook
from .models import Client
from .serializers import ClientSerializer, ClientDetailSerializer
from apps.users.permissions import IsManagerOrHigher


class ClientListCreateView(generics.ListCreateAPIView):
    serializer_class = ClientSerializer
    permission_classes = [IsManagerOrHigher]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'phone', 'email', 'telegram']

    def get_queryset(self):
        qs = Client.objects.all()
        if self.request.query_params.get('archived') != '1':
            qs = qs.filter(is_archived=False)
        else:
            qs = qs.filter(is_archived=True, archived_at__gte=timezone.now() - timedelta(days=7))
        return qs


class ClientExportView(APIView):
    permission_classes = [IsManagerOrHigher]

    def get(self, request):
        qs = Client.objects.all()
        if request.query_params.get('archived') != '1':
            qs = qs.filter(is_archived=False)
        else:
            qs = qs.filter(is_archived=True, archived_at__gte=timezone.now() - timedelta(days=7))

        wb = Workbook()
        ws = wb.active
        ws.title = 'Клиенты'
        ws.append(['ID', 'Имя', 'Телефон', 'Email', 'Telegram', 'Дата рождения', 'Заметки', 'В архиве', 'Создан', 'Обновлён'])
        for client in qs:
            ws.append([
                client.id,
                client.name,
                client.phone,
                client.email,
                client.telegram,
                client.birthday.strftime('%d.%m.%Y') if client.birthday else '',
                client.notes,
                'Да' if client.is_archived else 'Нет',
                client.created_at.strftime('%d.%m.%Y %H:%M'),
                client.updated_at.strftime('%d.%m.%Y %H:%M'),
            ])

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="clients.xlsx"'
        wb.save(response)
        return response


class ClientDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Client.objects.all()
    serializer_class = ClientDetailSerializer
    permission_classes = [IsManagerOrHigher]

    def perform_update(self, serializer):
        instance = serializer.instance
        old_archived = instance.is_archived
        new_archived = serializer.validated_data.get('is_archived', old_archived)
        if new_archived and not old_archived:
            serializer.save(archived_at=timezone.now())
        elif not new_archived and old_archived:
            serializer.save(archived_at=None)
        else:
            serializer.save()
