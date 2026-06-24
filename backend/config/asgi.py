import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Ensure Django is fully loaded before importing route modules that use models.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from apps.chat import routing

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': URLRouter(routing.websocket_urlpatterns),
})
