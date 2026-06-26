from django.urls import path
from .views import ChatListCreateView, ChatDetailView, MessageListCreateView, MarkReadView, StickerListView, UnreadCountView

urlpatterns = [
    path('', ChatListCreateView.as_view(), name='chat_list_create'),
    path('<int:pk>/', ChatDetailView.as_view(), name='chat_detail'),
    path('<int:chat_id>/messages/', MessageListCreateView.as_view(), name='chat_messages'),
    path('<int:chat_id>/read/', MarkReadView.as_view(), name='chat_mark_read'),
    path('stickers/', StickerListView.as_view(), name='sticker_list'),
    path('unread/', UnreadCountView.as_view(), name='chat_unread_count'),
]
