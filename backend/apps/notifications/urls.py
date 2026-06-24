from django.urls import path
from .views import (
    InAppNotificationListView,
    InAppNotificationUnreadCountView,
    InAppNotificationMarkReadView,
    InAppNotificationMarkAllReadView,
    UserNotificationPreferenceView,
    PushSubscriptionView,
)

urlpatterns = [
    path('', InAppNotificationListView.as_view(), name='notification_list'),
    path('unread-count/', InAppNotificationUnreadCountView.as_view(), name='notification_unread_count'),
    path('<int:pk>/read/', InAppNotificationMarkReadView.as_view(), name='notification_mark_read'),
    path('read-all/', InAppNotificationMarkAllReadView.as_view(), name='notification_mark_all_read'),
    path('preferences/', UserNotificationPreferenceView.as_view(), name='notification_preferences'),
    path('push-subscription/', PushSubscriptionView.as_view(), name='push_subscription'),
]
