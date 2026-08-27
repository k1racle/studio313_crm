from datetime import timedelta
from unittest.mock import patch

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.booking.models import Booking, Service
from apps.client_portal.models import ClientAccessToken, MaterialApproval
from apps.clients.models import Client
from apps.helpdesk.models import HelpdeskTicket
from apps.notifications.models import InAppNotification
from apps.payments.models import PaymentPlan, PlannedPayment
from apps.projects.models import Project
from apps.tasks.models import Task
from apps.tasks.tasks import send_task_deadline_reminders
from apps.users.models import RoleProfile, User


class CrmWorkspaceApiTests(APITestCase):
    def setUp(self):
        self.role = RoleProfile.objects.create(
            name='Тестовый продюсер',
            slug='test-producer',
            permissions=[
                'tasks.view', 'tasks.manage', 'approvals.view', 'approvals.manage',
                'clients.view', 'projects.view', 'projects.manage', 'bookings.view',
                'finance.view', 'finance.manage', 'helpdesk.view', 'helpdesk.manage',
                'chat.view', 'files.view',
            ],
        )
        self.user = User.objects.create_user(username='producer', password='test', custom_role=self.role)
        self.client.force_authenticate(self.user)
        self.customer = Client.objects.create(name='Иван Петров', phone='+7 900 123-45-67')
        self.project = Project.objects.create(name='Рекламный ролик')
        self.project.members.add(self.user)

    def test_workday_aggregates_existing_entities(self):
        task = Task.objects.create(
            title='Просроченный монтаж',
            project=self.project,
            client=self.customer,
            creator=self.user,
            due_date=timezone.now() - timedelta(days=1),
        )
        task.assignees.add(self.user)
        MaterialApproval.objects.create(client=self.customer, project=self.project, title='Версия 2', submitted_by=self.user)
        HelpdeskTicket.objects.create(subject='Вопрос клиента', description='Нужна помощь', assignee=self.user)
        service = Service.objects.create(name='Съёмка', duration_minutes=60, price=10000)
        Booking.objects.create(
            client=self.customer,
            service=service,
            start_time=timezone.now() + timedelta(hours=2),
            end_time=timezone.now() + timedelta(hours=3),
        )
        plan = PaymentPlan.objects.create(
            title='Аренда', counterparty='Арендодатель', purpose='Студия',
            amount=20000, start_date=timezone.localdate(), created_by=self.user,
        )
        plan.responsible.add(self.user)
        PlannedPayment.objects.create(plan=plan, due_date=timezone.localdate(), amount=20000)

        response = self.client.get('/api/analytics/workday/')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(item['title'] == 'Просроченный монтаж' for item in response.data['overdue_tasks']))
        self.assertTrue(any(item['title'] == 'Версия 2' for item in response.data['approvals']))
        self.assertTrue(any(item['title'] == 'Вопрос клиента' for item in response.data['tickets']))
        self.assertTrue(any(item['title'] == 'Съёмка' for item in response.data['bookings']))
        self.assertTrue(any(item['title'] == 'Аренда' for item in response.data['payments']))

    def test_global_search_finds_phone_project_and_task(self):
        Task.objects.create(title='Собрать тизер', project=self.project, creator=self.user)

        phone_response = self.client.get('/api/analytics/search/', {'q': '123-45'})
        project_response = self.client.get('/api/analytics/search/', {'q': 'Рекламный'})
        task_response = self.client.get('/api/analytics/search/', {'q': 'тизер'})

        self.assertEqual(phone_response.status_code, 200)
        self.assertTrue(any(group['key'] == 'clients' for group in phone_response.data['groups']))
        self.assertTrue(any(group['key'] == 'projects' for group in project_response.data['groups']))
        self.assertTrue(any(group['key'] == 'tasks' for group in task_response.data['groups']))

    def test_custom_role_grants_access_to_protected_client_api(self):
        response = self.client.get('/api/clients/', {'search': 'Иван Петров'})

        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(item['name'] == 'Иван Петров' for item in response.data['results']))

    def test_client_can_approve_material_with_portal_token(self):
        token = ClientAccessToken.objects.create(client=self.customer)
        approval = MaterialApproval.objects.create(
            client=self.customer,
            project=self.project,
            title='Финальный ролик',
            submitted_by=self.user,
        )
        self.client.force_authenticate(user=None)

        response = self.client.post(
            f'/api/client-portal/{token.token}/approvals/{approval.id}/respond/',
            {'status': MaterialApproval.STATUS_APPROVED, 'comment': 'Всё отлично'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        approval.refresh_from_db()
        self.assertEqual(approval.status, MaterialApproval.STATUS_APPROVED)
        self.assertEqual(approval.client_comment, 'Всё отлично')
        self.assertIsNotNone(approval.responded_at)

    def test_admin_can_configure_and_assign_roles(self):
        admin = User.objects.create_user(username='admin', password='test', role=User.ROLE_ADMIN)
        self.client.force_authenticate(admin)

        roles_response = self.client.get('/api/auth/roles/')
        assign_response = self.client.patch(
            f'/api/auth/users/{self.user.id}/',
            {'custom_role': self.role.id},
            format='json',
        )

        self.assertEqual(roles_response.status_code, 200)
        self.assertTrue(any(role['slug'] == 'producer' for role in roles_response.data))
        self.assertEqual(assign_response.status_code, 200)
        self.assertEqual(assign_response.data['custom_role'], self.role.id)

    @patch('apps.tasks.tasks.notify_user_task.delay')
    def test_deadline_reminder_is_created_only_once_per_day(self, notify_delay):
        task = Task.objects.create(
            title='Сдать монтаж',
            project=self.project,
            creator=self.user,
            due_date=timezone.now() + timedelta(hours=12),
        )
        task.assignees.add(self.user)

        send_task_deadline_reminders()
        send_task_deadline_reminders()

        notifications = InAppNotification.objects.filter(
            user=self.user,
            title='Близкий дедлайн',
            link=f'/tasks/{task.id}',
        )
        self.assertEqual(notifications.count(), 1)
        self.assertEqual(notify_delay.call_count, 1)
