from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import UserListCreateView, UserDetailView, CurrentUserView, CustomTokenObtainPairView, BirthdayListView

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('users/', UserListCreateView.as_view(), name='user_list_create'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user_detail'),
    path('users/birthdays/', BirthdayListView.as_view(), name='user_birthdays'),
]
