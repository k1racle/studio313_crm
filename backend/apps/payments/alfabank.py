import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def get_payment_settings():
    try:
        from .models import PaymentSettings
        return PaymentSettings.get_settings()
    except Exception:
        return None


def is_test_mode():
    s = get_payment_settings()
    if s:
        return s.test_mode
    return getattr(settings, 'ALFABANK_TEST_MODE', True)


def get_alfabank_base_url():
    s = get_payment_settings()
    if s and s.base_url:
        if is_test_mode():
            return 'https://web.rbsdev.com/abb/rest/'
        return s.base_url
    if getattr(settings, 'ALFABANK_TEST_MODE', True):
        return 'https://web.rbsdev.com/abb/rest/'
    return getattr(settings, 'ALFABANK_BASE_URL', 'https://pay.alfabank.ru/rest/')


def get_credentials():
    s = get_payment_settings()
    if s:
        return {
            'userName': s.username,
            'password': s.password,
            'token': s.token,
        }
    return {
        'userName': getattr(settings, 'ALFABANK_USERNAME', ''),
        'password': getattr(settings, 'ALFABANK_PASSWORD', ''),
        'token': getattr(settings, 'ALFABANK_TOKEN', ''),
    }


def register_payment(amount, order_number, return_url, description=''):
    """
    Регистрирует заказ в Альфа-Банке.
    В тестовом режиме возвращает моковый ответ.
    """
    if is_test_mode():
        logger.info(f'[Альфа-Банк TEST] Регистрация заказа {order_number} на сумму {amount}')
        return {
            'success': True,
            'orderId': f'test-order-{order_number}',
            'formUrl': f'{return_url}?test_payment=1&orderId=test-order-{order_number}',
        }

    base_url = get_alfabank_base_url()
    creds = get_credentials()
    payload = {
        'userName': creds['userName'],
        'password': creds['password'],
        'token': creds['token'] or '',
        'orderNumber': order_number,
        'amount': int(amount * 100),  # в копейках
        'currency': '643',
        'returnUrl': return_url,
        'description': description,
    }

    try:
        res = requests.post(f'{base_url}register.do', data=payload, timeout=30)
        data = res.json()
        if 'errorCode' in data and data['errorCode'] != '0':
            logger.error(f'Ошибка Альфа-Банка: {data}')
            return {'success': False, 'error': data.get('errorMessage', 'Unknown error')}
        return {
            'success': True,
            'orderId': data.get('orderId'),
            'formUrl': data.get('formUrl'),
        }
    except Exception as e:
        logger.error(f'Ошибка запроса к Альфа-Банку: {e}')
        return {'success': False, 'error': str(e)}


def check_order_status(order_id):
    """
    Проверяет статус заказа в Альфа-Банке.
    В тестовом режиме возвращает успех.
    """
    if is_test_mode():
        return {'success': True, 'status': 2, 'status_name': 'Оплачен'}

    base_url = get_alfabank_base_url()
    creds = get_credentials()
    payload = {
        'userName': creds['userName'],
        'password': creds['password'],
        'token': creds['token'] or '',
        'orderId': order_id,
    }

    try:
        res = requests.post(f'{base_url}getOrderStatusExtended.do', data=payload, timeout=30)
        data = res.json()
        return {
            'success': data.get('ErrorCode') == '0',
            'status': data.get('OrderStatus'),
            'status_name': data.get('OrderStatus') == 2 and 'Оплачен' or 'Другой',
        }
    except Exception as e:
        logger.error(f'Ошибка проверки статуса Альфа-Банка: {e}')
        return {'success': False, 'error': str(e)}
