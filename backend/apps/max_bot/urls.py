from django.urls import path
from .views import MaxWebhookView


urlpatterns = [
    path('webhook/', MaxWebhookView.as_view(), name='max-webhook'),
]
