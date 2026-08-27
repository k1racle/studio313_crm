from django.db.models import Count
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .birthdays import collect_birthdays
from .models import PERMISSION_CATALOG, RoleProfile, User
from .permissions import IsAdminOrDirector, IsManagerOrHigher
from .serializers import RoleProfileSerializer, UserCreateSerializer, UserSerializer


class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.all()
    pagination_class = None

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminOrDirector()]
        return [IsManagerOrHigher()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminOrDirector]


class CurrentUserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = User.objects.get(username=request.data.get('username'))
            response.data['user'] = UserSerializer(user).data
        return response


class BirthdayListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        window_days = int(request.query_params.get('days', 7))
        return Response(collect_birthdays(window_days=window_days))


class RoleListCreateView(generics.ListCreateAPIView):
    serializer_class = RoleProfileSerializer
    permission_classes = [IsAdminOrDirector]
    pagination_class = None

    def get_queryset(self):
        return RoleProfile.objects.annotate(users_count=Count('users')).order_by('name')


class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = RoleProfile.objects.all()
    serializer_class = RoleProfileSerializer
    permission_classes = [IsAdminOrDirector]

    def perform_destroy(self, instance):
        if instance.is_system:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('Системную роль нельзя удалить')
        instance.delete()


class PermissionCatalogView(APIView):
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        return Response([
            {'code': code, 'group': group, 'label': label}
            for code, group, label in PERMISSION_CATALOG
        ])
