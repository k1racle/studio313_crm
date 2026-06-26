from django.urls import path
from .views import MaxWebhookView, MaxLinkCodeView


urlpatterns = [
    path('webhook/', MaxWebhookView.as_view(), name='max-webhook'),
    path('link-code/', MaxLinkCodeView.as_view(), name='max-link-code'),
]
