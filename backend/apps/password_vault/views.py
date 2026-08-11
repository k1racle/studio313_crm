from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import filters, generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PasswordVaultCategory, PasswordVaultEntry, PasswordVaultPermission
from .permissions import build_user_permission_map, get_visible_entries_queryset, has_category_permission, has_entry_permission
from .serializers import (
    PasswordVaultEntrySerializer,
    PasswordVaultMetaSerializer,
    PasswordVaultPermissionUpdateSerializer,
    serialize_permission_row,
)

User = get_user_model()


class PasswordVaultEntryListCreateView(generics.ListCreateAPIView):
    serializer_class = PasswordVaultEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'login', 'url', 'notes']
    ordering_fields = ['title', 'created_at', 'updated_at', 'category']
    ordering = ['category', 'title']

    def get_queryset(self):
        queryset = PasswordVaultEntry.objects.select_related('created_by', 'updated_by').prefetch_related('shared_with')
        queryset = get_visible_entries_queryset(queryset, self.request.user)

        category = self.request.query_params.get('category')
        if category in PasswordVaultCategory.values:
            queryset = queryset.filter(category=category)

        access_user_id = self.request.query_params.get('access_user_id')
        if self.request.user.is_admin and access_user_id:
            queryset = queryset.filter(Q(created_by_id=access_user_id) | Q(shared_with__id=access_user_id)).distinct()
        return queryset

    def perform_create(self, serializer):
        category = serializer.validated_data['category']
        if not has_category_permission(self.request.user, category, 'add'):
            raise PermissionDenied('Недостаточно прав для создания записи в этой категории.')
        serializer.save()


class PasswordVaultEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PasswordVaultEntry.objects.select_related('created_by', 'updated_by').prefetch_related('shared_with')
    serializer_class = PasswordVaultEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        obj = super().get_object()
        if self.request.method == 'GET':
            allowed = has_entry_permission(self.request.user, obj, 'view')
        elif self.request.method in ('PUT', 'PATCH'):
            allowed = has_entry_permission(self.request.user, obj, 'change')
        else:
            allowed = has_entry_permission(self.request.user, obj, 'delete')
        if not allowed:
            raise PermissionDenied('Недостаточно прав для работы с этой записью.')
        return obj

    def perform_update(self, serializer):
        target_category = serializer.validated_data.get('category', serializer.instance.category)
        if not has_category_permission(self.request.user, target_category, 'change'):
            raise PermissionDenied('Недостаточно прав для изменения записи в выбранной категории.')
        serializer.save()


class PasswordVaultMetaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        users = User.objects.filter(is_active=True).order_by('last_name', 'first_name', 'username')
        data = {
            'categories': [
                {'value': value, 'label': label}
                for value, label in PasswordVaultCategory.choices
            ],
            'current_permissions': build_user_permission_map(request.user),
            'can_manage_permissions': request.user.is_admin,
            'users': users,
        }
        if request.user.is_admin:
            data['permission_matrix'] = [serialize_permission_row(user) for user in users]
        serializer = PasswordVaultMetaSerializer(data)
        return Response(serializer.data)


class PasswordVaultPermissionUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, user_id):
        return self._update_permissions(request, user_id)

    def patch(self, request, user_id):
        return self._update_permissions(request, user_id)

    def _update_permissions(self, request, user_id):
        if not request.user.is_admin:
            raise PermissionDenied('Только администратор может менять права хранилища.')

        target_user = generics.get_object_or_404(User, pk=user_id)
        if target_user.is_admin:
            return Response(
                {'detail': 'Для администратора права не редактируются: полный доступ выдан всегда.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PasswordVaultPermissionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        permissions_payload = serializer.validated_data['permissions']
        existing = {
            item.category: item
            for item in PasswordVaultPermission.objects.filter(user=target_user)
        }
        for category in PasswordVaultCategory.values:
            values = permissions_payload[category]
            item = existing.get(category)
            if item is None:
                item = PasswordVaultPermission(user=target_user, category=category)
            item.can_view = values['view']
            item.can_add = values['add']
            item.can_change = values['change']
            item.can_delete = values['delete']
            item.save()

        return Response(serialize_permission_row(target_user))
