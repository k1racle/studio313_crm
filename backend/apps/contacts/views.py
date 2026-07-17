from django.db.models import Q
from django.http import HttpResponse
from rest_framework import generics, filters
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from openpyxl import Workbook
import json
from .models import Contact
from .serializers import ContactSerializer


def format_links(value):
    """Отрендерить JSON-список [{'name', 'link'}] в читаемый текст для экспорта."""
    if not value:
        return ''
    try:
        items = json.loads(value)
    except (ValueError, TypeError):
        return value
    if not isinstance(items, list):
        return value
    parts = []
    for item in items:
        if not isinstance(item, dict):
            continue
        name = item.get('name', '')
        link = item.get('link', '')
        parts.append(f'{name}: {link}' if link else name)
    return '\n'.join(p for p in parts if p)


class ContactListCreateView(generics.ListCreateAPIView):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['organization']
    search_fields = ['full_name', 'organization']
    ordering_fields = ['full_name', 'organization', 'created_at']


class ContactDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer


class ContactExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Contact.objects.all()
        search = request.query_params.get('search')
        organization = request.query_params.get('organization')
        if search:
            qs = qs.filter(
                models.Q(full_name__icontains=search) |
                models.Q(organization__icontains=search)
            )
        if organization:
            qs = qs.filter(organization__iexact=organization)

        wb = Workbook()
        ws = wb.active
        ws.title = 'Контакты'
        ws.append(['ID', 'ФИО', 'Организация', 'Должность', 'Телефон', 'Email', 'Мессенджеры', 'Соцсети', 'Дата рождения', 'Город', 'Оперативный канал связи', 'Заметки', 'Создан', 'Обновлён'])
        for contact in qs:
            ws.append([
                contact.id,
                contact.full_name,
                contact.organization,
                contact.position,
                contact.phone,
                contact.email,
                format_links(contact.messengers),
                format_links(contact.social_networks),
                contact.birth_date.strftime('%d.%m.%Y') if contact.birth_date else '',
                contact.city,
                'Да' if contact.quick_communication else 'Нет',
                contact.notes,
                contact.created_at.strftime('%d.%m.%Y %H:%M'),
                contact.updated_at.strftime('%d.%m.%Y %H:%M'),
            ])

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="contacts.xlsx"'
        wb.save(response)
        return response
