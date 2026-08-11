from django.urls import path

from .views import (
    PasswordVaultEntryDetailView,
    PasswordVaultEntryListCreateView,
    PasswordVaultMetaView,
    PasswordVaultPermissionUpdateView,
)

urlpatterns = [
    path('meta/', PasswordVaultMetaView.as_view(), name='password_vault_meta'),
    path('entries/', PasswordVaultEntryListCreateView.as_view(), name='password_vault_entry_list'),
    path('entries/<int:pk>/', PasswordVaultEntryDetailView.as_view(), name='password_vault_entry_detail'),
    path('permissions/<int:user_id>/', PasswordVaultPermissionUpdateView.as_view(), name='password_vault_permission_update'),
]

