from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Q
from .models import InAppNotification, UserNotificationPreference
from .serializers import InAppNotificationSerializer, UserNotificationPreferenceSerializer


class InAppNotificationListView(generics.ListAPIView):
    serializer_class = InAppNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return InAppNotification.objects.filter(user=self.request.user)


class InAppNotificationUnreadCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = InAppNotification.objects.filter(user=request.user, is_read=False).count()
        return Response({'unread_count': count})


class InAppNotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        notification = InAppNotification.objects.filter(user=request.user, pk=pk).first()
        if notification:
            notification.is_read = True
            notification.save()
        return Response({'status': 'ok'})


class InAppNotificationMarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        InAppNotification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'ok'})


class UserNotificationPreferenceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        pref, _ = UserNotificationPreference.objects.get_or_create(user=request.user)
        return Response(UserNotificationPreferenceSerializer(pref).data)

    def patch(self, request):
        pref, _ = UserNotificationPreference.objects.get_or_create(user=request.user)
        serializer = UserNotificationPreferenceSerializer(pref, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
