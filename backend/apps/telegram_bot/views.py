from datetime import timedelta
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from .models import NewsSuggestion, TelegramLinkCode
from .serializers import NewsSuggestionSerializer
from apps.users.permissions import IsManagerOrHigher


class NewsSuggestionListView(generics.ListAPIView):
    queryset = NewsSuggestion.objects.all()
    serializer_class = NewsSuggestionSerializer
    permission_classes = [IsManagerOrHigher]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status']


class NewsSuggestionApproveView(generics.UpdateAPIView):
    queryset = NewsSuggestion.objects.all()
    serializer_class = NewsSuggestionSerializer
    permission_classes = [IsManagerOrHigher]

    def perform_update(self, serializer):
        suggestion = serializer.save(status=NewsSuggestion.STATUS_APPROVED)
        if not suggestion.created_task:
            from apps.tasks.models import Task
            task = Task.objects.create(
                title=suggestion.title,
                description=suggestion.description,
                source=Task.SOURCE_TELEGRAM,
            )
            suggestion.created_task = task
            suggestion.save()


class TelegramLinkCodeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        link_code, _ = TelegramLinkCode.objects.update_or_create(
            user=request.user,
            defaults={'code': ''}
        )
        link_code.save()
        return Response({
            'code': link_code.code,
            'expires_at': link_code.created_at + timedelta(hours=1)
        })
