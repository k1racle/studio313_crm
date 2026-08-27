from django.urls import path
from .views import (
    ClientAccessTokenListCreateView,
    ClientAccessTokenDetailView,
    ClientPortalView,
    ClientApprovalResponseView,
    MaterialApprovalDetailView,
    MaterialApprovalListCreateView,
    MaterialApprovalOptionsView,
)

urlpatterns = [
    path('tokens/', ClientAccessTokenListCreateView.as_view(), name='portal_tokens'),
    path('tokens/<int:pk>/', ClientAccessTokenDetailView.as_view(), name='portal_token_detail'),
    path('approvals/', MaterialApprovalListCreateView.as_view(), name='material_approvals'),
    path('approvals/<int:pk>/', MaterialApprovalDetailView.as_view(), name='material_approval_detail'),
    path('approval-options/', MaterialApprovalOptionsView.as_view(), name='material_approval_options'),
    path('<str:token>/approvals/<int:pk>/respond/', ClientApprovalResponseView.as_view(), name='client_approval_response'),
    path('<str:token>/', ClientPortalView.as_view(), name='client_portal'),
]
