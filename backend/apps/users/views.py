from datetime import date
from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User
from .serializers import UserSerializer, UserCreateSerializer
from .permissions import IsAdminOrDirector, IsManagerOrHigher


def _next_birthday(birth_date: date, today: date) -> date:
    try:
        next_bday = date(today.year, birth_date.month, birth_date.day)
    except ValueError:
        # 29 февраля в невисокосный год
        next_bday = date(today.year, 2, 28)
    if next_bday < today:
        try:
            next_bday = date(today.year + 1, birth_date.month, birth_date.day)
        except ValueError:
            next_bday = date(today.year + 1, 2, 28)
    return next_bday


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
        today = date.today()
        window_days = int(request.query_params.get('days', 7))
        result = []
        for user in User.objects.filter(birth_date__isnull=False, is_active=True):
            next_bday = _next_birthday(user.birth_date, today)
            delta = (next_bday - today).days
            if 0 <= delta <= window_days:
                result.append({
                    'id': user.id,
                    'full_name': user.get_short_name(),
                    'birth_date': user.birth_date.isoformat(),
                    'next_birthday': next_bday.isoformat(),
                    'days_until': delta,
                    'is_today': delta == 0,
                })
        result.sort(key=lambda x: (x['days_until'], x['full_name']))
        return Response(result)
