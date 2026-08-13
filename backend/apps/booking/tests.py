from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.booking.models import Booking, Service
from apps.users.models import User


class PublicBookingCreateTests(APITestCase):
    def test_public_booking_is_created_even_if_manager_notification_fails(self):
        service = Service.objects.create(
            name='Podcast',
            duration_minutes=60,
            price='5000.00',
            is_active=True,
        )
        User.objects.create_user(
            username='manager',
            password='secret',
            role=User.ROLE_MANAGER,
        )

        payload = {
            'client_name': 'Иван',
            'client_phone': '+79990000000',
            'service_id': service.id,
            'start_time': '2026-08-13T12:00:00+03:00',
            'notes': 'Тестовая запись',
        }

        with patch('apps.booking.views.create_in_app_notification', side_effect=RuntimeError('boom')):
            response = self.client.post(reverse('public_booking_create'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Booking.objects.count(), 1)
