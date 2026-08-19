from django.core import signing


BOOKING_TOKEN_SALT = 'payments.booking'
PAYMENT_TOKEN_SALT = 'payments.payment'


def build_booking_token(booking_id):
    return signing.dumps({'booking_id': booking_id}, salt=BOOKING_TOKEN_SALT, compress=True)


def read_booking_token(token, max_age=60 * 60 * 24):
    return signing.loads(token, salt=BOOKING_TOKEN_SALT, max_age=max_age)


def build_payment_token(payment_id):
    return signing.dumps({'payment_id': payment_id}, salt=PAYMENT_TOKEN_SALT, compress=True)


def read_payment_token(token, max_age=60 * 60 * 24 * 30):
    return signing.loads(token, salt=PAYMENT_TOKEN_SALT, max_age=max_age)
