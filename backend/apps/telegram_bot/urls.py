from django.urls import path
from .views import (
    NewsSuggestionListView, NewsSuggestionApproveView,
    TelegramLinkCodeView, TelegramWebhookView
)

urlpatterns = [
    path('suggestions/', NewsSuggestionListView.as_view(), name='suggestion_list'),
    path('suggestions/<int:pk>/approve/', NewsSuggestionApproveView.as_view(), name='suggestion_approve'),
    path('link-code/', TelegramLinkCodeView.as_view(), name='telegram_link_code'),
    path('webhook/', TelegramWebhookView.as_view(), name='telegram_webhook'),
]
