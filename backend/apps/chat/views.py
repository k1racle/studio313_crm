from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from django.contrib.auth import get_user_model
from .models import Chat, Message, Sticker
from .serializers import ChatSerializer, ChatCreateSerializer, MessageSerializer, StickerSerializer
from .tasks import transcribe_voice_message

User = get_user_model()


class ChatListCreateView(generics.ListCreateAPIView):
    serializer_class = ChatSerializer

    def get_queryset(self):
        return Chat.objects.filter(members=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = ChatCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data.get('type') == Chat.TYPE_DIRECT:
            # find existing direct chat
            member_ids = serializer.validated_data.get('member_ids')
            existing = Chat.objects.filter(type=Chat.TYPE_DIRECT, members__id=member_ids[0]).filter(members__id=member_ids[1]).first()
            if existing:
                return Response(ChatSerializer(existing, context={'request': request}).data, status=status.HTTP_200_OK)
        chat = serializer.save()
        return Response(ChatSerializer(chat, context={'request': request}).data, status=status.HTTP_201_CREATED)


class ChatDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ChatSerializer

    def get_queryset(self):
        return Chat.objects.filter(members=self.request.user)


class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer

    def get_queryset(self):
        chat_id = self.kwargs['chat_id']
        return Message.objects.filter(chat_id=chat_id, chat__members=self.request.user)

    def perform_create(self, serializer):
        chat = Chat.objects.get(pk=self.kwargs['chat_id'])
        message = serializer.save(chat=chat, sender=self.request.user)
        if message.voice:
            transcribe_voice_message.delay(message.id)


class MarkReadView(APIView):
    def post(self, request, chat_id):
        chat = Chat.objects.filter(pk=chat_id, members=request.user).first()
        if not chat:
            return Response({'detail': 'Не найдено'}, status=status.HTTP_404_NOT_FOUND)
        messages = Message.objects.filter(chat=chat).exclude(sender=request.user).exclude(read_by=request.user)
        for msg in messages:
            msg.mark_read_by(request.user)
        return Response({'ok': True})


class StickerListView(generics.ListAPIView):
    queryset = Sticker.objects.all()
    serializer_class = StickerSerializer
