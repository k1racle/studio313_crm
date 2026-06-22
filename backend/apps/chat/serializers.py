from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Chat, Message, Sticker

User = get_user_model()


class UserShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'username', 'avatar']


class StickerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sticker
        fields = ['id', 'name', 'image']


class MessageSerializer(serializers.ModelSerializer):
    sender = UserShortSerializer(read_only=True)
    sticker = StickerSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()
    voice_url = serializers.SerializerMethodField()
    reply_to_id = serializers.PrimaryKeyRelatedField(source='reply_to', queryset=Message.objects.all(), required=False, allow_null=True)
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'chat', 'sender', 'text', 'sticker', 'file', 'file_url', 'voice', 'voice_url', 'transcription', 'reply_to', 'reply_to_id', 'created_at', 'is_read']
        read_only_fields = ['chat', 'sender', 'transcription']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

    def get_voice_url(self, obj):
        if obj.voice:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.voice.url)
            return obj.voice.url
        return None

    def get_is_read(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        return obj.read_by.filter(id=request.user.id).exists()


class ChatSerializer(serializers.ModelSerializer):
    members = UserShortSerializer(many=True, read_only=True)
    member_ids = serializers.PrimaryKeyRelatedField(source='members', queryset=User.objects.all(), many=True, write_only=True, required=False)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    display_name = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = ['id', 'type', 'name', 'display_name', 'members', 'member_ids', 'created_at', 'updated_at', 'last_message', 'unread_count']

    def get_display_name(self, obj):
        return obj.display_name

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if msg:
            return MessageSerializer(msg, context=self.context).data
        return None

    def get_unread_count(self, obj):
        user = self.context['request'].user
        return obj.messages.exclude(sender=user).exclude(read_by=user).count()

    def validate(self, attrs):
        members = attrs.get('members', [])
        if attrs.get('type') == Chat.TYPE_DIRECT and len(members) != 2:
            raise serializers.ValidationError('Личный чат должен содержать ровно двух участников')
        return attrs


class ChatCreateSerializer(serializers.ModelSerializer):
    member_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True)

    class Meta:
        model = Chat
        fields = ['id', 'type', 'name', 'member_ids']

    def validate(self, attrs):
        member_ids = attrs.get('member_ids', [])
        request_user = self.context['request'].user
        if request_user.id not in member_ids:
            member_ids.append(request_user.id)
            attrs['member_ids'] = member_ids
        if attrs.get('type') == Chat.TYPE_DIRECT and len(member_ids) != 2:
            raise serializers.ValidationError('Личный чат должен содержать ровно двух участников')
        return attrs

    def create(self, validated_data):
        member_ids = validated_data.pop('member_ids')
        chat = Chat.objects.create(**validated_data)
        chat.members.set(member_ids)
        return chat
