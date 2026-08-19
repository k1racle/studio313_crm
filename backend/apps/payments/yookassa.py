import logging
import uuid

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = 'https://api.yookassa.ru/v3/'


def get_payment_settings():
    try:
        from .models import PaymentSettings

        return PaymentSettings.get_settings()
    except Exception:
        return None


def is_test_mode():
    settings_obj = get_payment_settings()
    if settings_obj:
        return settings_obj.test_mode
    return getattr(settings, 'YOOKASSA_TEST_MODE', True)


def get_base_url():
    settings_obj = get_payment_settings()
    if settings_obj and settings_obj.base_url:
        return settings_obj.base_url.rstrip('/') + '/'
    return getattr(settings, 'YOOKASSA_BASE_URL', DEFAULT_BASE_URL).rstrip('/') + '/'


def get_credentials():
    settings_obj = get_payment_settings()
    if settings_obj:
        return {
            'shop_id': settings_obj.username,
            'secret_key': settings_obj.password,
        }
    return {
        'shop_id': getattr(settings, 'YOOKASSA_SHOP_ID', ''),
        'secret_key': getattr(settings, 'YOOKASSA_SECRET_KEY', ''),
    }


def use_mock_mode():
    creds = get_credentials()
    return is_test_mode() and (not creds['shop_id'] or not creds['secret_key'])


def create_payment(*, amount, return_url, description, metadata, idempotence_key=None):
    if use_mock_mode():
        payment_id = f'mock-{uuid.uuid4().hex}'
        separator = '&' if '?' in return_url else '?'
        logger.info('[YooKassa TEST] mock payment created for %s', amount)
        return {
            'success': True,
            'payment_id': payment_id,
            'status': 'pending',
            'confirmation_url': f'{return_url}{separator}mock_payment=1',
            'idempotence_key': idempotence_key or uuid.uuid4().hex,
        }

    creds = get_credentials()
    payload = {
        'amount': {
            'value': f'{amount:.2f}',
            'currency': 'RUB',
        },
        'capture': True,
        'confirmation': {
            'type': 'redirect',
            'return_url': return_url,
        },
        'description': description,
        'metadata': metadata or {},
    }
    idempotence_key = idempotence_key or uuid.uuid4().hex

    try:
        response = requests.post(
            f'{get_base_url()}payments',
            json=payload,
            auth=(creds['shop_id'], creds['secret_key']),
            headers={'Idempotence-Key': idempotence_key},
            timeout=30,
        )
        data = response.json()
        if response.status_code >= 400:
            logger.error('YooKassa create payment error: %s', data)
            return {
                'success': False,
                'error': data.get('description') or data.get('type') or 'YooKassa error',
            }

        confirmation = data.get('confirmation') or {}
        return {
            'success': True,
            'payment_id': data.get('id'),
            'status': data.get('status'),
            'confirmation_url': confirmation.get('confirmation_url'),
            'idempotence_key': idempotence_key,
        }
    except Exception as error:
        logger.exception('YooKassa create payment failed')
        return {'success': False, 'error': str(error)}


def get_payment(payment_id):
    if use_mock_mode():
        return {'success': True, 'payment_id': payment_id, 'status': 'succeeded'}

    creds = get_credentials()

    try:
        response = requests.get(
            f'{get_base_url()}payments/{payment_id}',
            auth=(creds['shop_id'], creds['secret_key']),
            timeout=30,
        )
        data = response.json()
        if response.status_code >= 400:
            logger.error('YooKassa get payment error: %s', data)
            return {
                'success': False,
                'error': data.get('description') or data.get('type') or 'YooKassa error',
            }
        return {
            'success': True,
            'payment_id': data.get('id'),
            'status': data.get('status'),
            'paid': data.get('paid', False),
            'raw': data,
        }
    except Exception as error:
        logger.exception('YooKassa get payment failed')
        return {'success': False, 'error': str(error)}
