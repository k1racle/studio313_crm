from django.urls import path
from .views import (
    ClientAccessTokenListCreateView,
    ClientAccessTokenDetailView,
    ClientPortalView,
)

urlpatterns = [
    path('tokens/', ClientAccessTokenListCreateView.as_view(), name='portal_tokens'),
    path('tokens/<int:pk>/', ClientAccessTokenDetailView.as_view(), name='portal_token_detail'),
    path('<str:token>/', ClientPortalView.as_view(), name='client_portal'),
]
