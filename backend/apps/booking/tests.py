from unittest.mock import patch
from datetime import datetime

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.booking.models import Booking, Service
from apps.users.models import User


class PublicBookingCreateTests(APITestCase):
    def setUp(self):
        self.service = Service.objects.create(
            name='Podcast',
            duration_minutes=60,
            price='5000.00',
            is_active=True,
        )

    def aware(self, year, month, day, hour, minute=0):
        return timezone.make_aware(datetime(year, month, day, hour, minute), timezone.get_current_timezone())

    def test_public_booking_is_created_even_if_manager_notification_fails(self):
        User.objects.create_user(
            username='manager',
            password='secret',
            role=User.ROLE_MANAGER,
        )

        payload = {
            'client_name': 'Иван',
            'client_phone': '+79990000000',
            'service_id': self.service.id,
            'start_time': '2030-08-13T12:00:00+03:00',
            'notes': 'Тестовая запись',
        }

        with patch('apps.booking.views.create_in_app_notification', side_effect=RuntimeError('boom')):
            response = self.client.post(reverse('public_booking_create'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        booking = Booking.objects.get()
        self.assertIsNone(booking.client)
        self.assertEqual(booking.requester_name, 'Иван')
        self.assertEqual(booking.requester_phone, '+79990000000')
        self.assertEqual(booking.status, Booking.STATUS_PENDING)

    def test_public_booking_normalizes_phone_and_keeps_request_pending(self):
        payload = {
            'client_name': 'Иван Иванов',
            'client_phone': '8 999 123 45 67',
            'service_id': self.service.id,
            'start_time': '2030-08-13T13:00:00+03:00',
            'notes': '',
        }

        response = self.client.post(reverse('public_booking_create'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        booking = Booking.objects.get()
        self.assertIsNone(booking.client)
        self.assertEqual(booking.requester_phone, '+79991234567')
        self.assertEqual(booking.status, Booking.STATUS_PENDING)
        self.assertEqual((booking.end_time - booking.start_time).total_seconds(), 3600)

    def test_public_booking_rejects_half_hour_start(self):
        payload = {
            'client_name': 'Иван',
            'client_phone': '+79990000000',
            'service_id': self.service.id,
            'start_time': '2030-08-13T12:30:00+03:00',
            'notes': '',
        }

        response = self.client.post(reverse('public_booking_create'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('start_time', response.data)

    def test_public_booking_rejects_invalid_name_and_phone(self):
        payload = {
            'client_name': 'Иван123',
            'client_phone': '+7 999 12',
            'service_id': self.service.id,
            'start_time': '2030-08-13T14:00:00+03:00',
            'notes': '',
        }

        response = self.client.post(reverse('public_booking_create'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('client_name', response.data)
        self.assertIn('client_phone', response.data)

    def test_manager_confirmation_creates_client(self):
        manager = User.objects.create_user(
            username='manager-2',
            password='secret',
            role=User.ROLE_MANAGER,
        )
        booking = Booking.objects.create(
            client=None,
            requester_name='Мария',
            requester_phone='+79995554433',
            service=self.service,
            start_time=self.aware(2030, 8, 14, 12),
            end_time=self.aware(2030, 8, 14, 13),
            status=Booking.STATUS_PENDING,
        )

        self.client.force_authenticate(manager)
        payload = {
            'client_id': None,
            'requester_name': 'Мария',
            'requester_phone': '+79995554433',
            'service_id': self.service.id,
            'start_time': '2030-08-14T12:00:00+03:00',
            'status': Booking.STATUS_CONFIRMED,
            'notes': '',
        }

        response = self.client.put(reverse('booking_detail', args=[booking.id]), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertIsNotNone(booking.client)
        self.assertEqual(booking.client.name, 'Мария')
        self.assertEqual(booking.client.phone, '+79995554433')
        self.assertEqual(booking.status, Booking.STATUS_CONFIRMED)

    def test_public_availability_marks_busy_slot(self):
        Booking.objects.create(
            client=None,
            requester_name='Анна',
            requester_phone='+79991112233',
            service=self.service,
            start_time=self.aware(2030, 8, 19, 10),
            end_time=self.aware(2030, 8, 19, 11),
            status=Booking.STATUS_PENDING,
        )

        response = self.client.get(
            reverse('public_booking_availability'),
            {'service_id': self.service.id, 'week_start': '2030-08-19'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ten_row = next(row for row in response.data['rows'] if row['time'] == '10:00')
        self.assertFalse(ten_row['cells'][0]['available'])
        self.assertFalse(any(row['time'].endswith(':30') for row in response.data['rows']))

    def test_public_booking_is_always_one_hour_for_legacy_service_duration(self):
        self.service.duration_minutes = 240
        self.service.save(update_fields=['duration_minutes'])
        payload = {
            'client_name': 'Иван',
            'client_phone': '+79990000000',
            'service_id': self.service.id,
            'start_time': '2030-08-13T20:00:00+03:00',
            'notes': '',
        }

        response = self.client.post(reverse('public_booking_create'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        booking = Booking.objects.get()
        self.assertEqual((booking.end_time - booking.start_time).total_seconds(), 3600)

        availability_response = self.client.get(
            reverse('public_booking_availability'),
            {'service_id': self.service.id, 'week_start': '2030-08-12'},
        )
        self.assertEqual(availability_response.status_code, status.HTTP_200_OK)
        self.assertEqual(availability_response.data['service']['duration_minutes'], 60)
        self.assertIn('21:00', [row['time'] for row in availability_response.data['rows']])


class ServiceOrderingTests(APITestCase):
    def setUp(self):
        self.manager = User.objects.create_user(
            username='service-manager',
            password='secret',
            role=User.ROLE_MANAGER,
        )
        self.first = Service.objects.create(name='Аренда', position=0, price='5000.00')
        self.second = Service.objects.create(name='Подкаст', position=1, price='5000.00')
        self.third = Service.objects.create(name='Монтаж', position=2, price='5000.00')
        self.client.force_authenticate(self.manager)

    def test_manager_can_reorder_services(self):
        requested_order = [self.third.id, self.first.id, self.second.id]

        response = self.client.post(
            reverse('service_reorder'),
            {'service_ids': requested_order},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([service['id'] for service in response.data], requested_order)
        self.assertEqual(
            list(Service.objects.order_by('position', 'id').values_list('id', flat=True)),
            requested_order,
        )

        widget_response = self.client.get(reverse('booking_widget'))
        widget_html = widget_response.content.decode('utf-8')
        self.assertLess(widget_html.index('Монтаж'), widget_html.index('Аренда'))
        self.assertLess(widget_html.index('Аренда'), widget_html.index('Подкаст'))

    def test_reorder_requires_complete_unique_list(self):
        response = self.client.post(
            reverse('service_reorder'),
            {'service_ids': [self.first.id, self.first.id]},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('service_ids', response.data)

    def test_new_service_is_appended_to_order(self):
        response = self.client.post(
            reverse('service_list_create'),
            {
                'name': 'Фотосессия',
                'description': '',
                'duration_minutes': 60,
                'price': '5000.00',
                'price_type': Service.PRICE_TYPE_FIXED,
                'is_active': True,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['position'], 3)
        self.assertEqual(response.data['price_type'], Service.PRICE_TYPE_FIXED)
