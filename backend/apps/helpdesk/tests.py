from django.test import TestCase
from django.urls import reverse

from .models import HelpdeskTicket


class HelpdeskWidgetTests(TestCase):
    def test_widget_uses_universal_request_copy(self):
        response = self.client.get(reverse('helpdesk_widget'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Новое обращение')
        self.assertNotContains(response, 'Связаться со студией')


class PublicTicketCreateTests(TestCase):
    def test_anyone_can_create_ticket_but_cannot_override_internal_fields(self):
        response = self.client.post(
            reverse('public_ticket_create'),
            data={
                'category': HelpdeskTicket.CATEGORY_TECHNICAL,
                'subject': 'Не открывается ссылка',
                'description': 'Страница сообщает об ошибке.',
                'requester_name': 'Анна',
                'requester_contact': '@anna',
                'status': HelpdeskTicket.STATUS_CLOSED,
                'priority': HelpdeskTicket.PRIORITY_HIGH,
                'assignee_id': 999,
            },
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        ticket = HelpdeskTicket.objects.get(pk=response.json()['id'])
        self.assertEqual(ticket.status, HelpdeskTicket.STATUS_OPEN)
        self.assertEqual(ticket.source, HelpdeskTicket.SOURCE_FORM)
        self.assertEqual(ticket.priority, HelpdeskTicket.PRIORITY_MEDIUM)
        self.assertIsNone(ticket.assignee)

    def test_required_request_fields_are_validated(self):
        response = self.client.post(
            reverse('public_ticket_create'),
            data={'category': HelpdeskTicket.CATEGORY_OTHER},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('subject', response.json())
        self.assertIn('description', response.json())
