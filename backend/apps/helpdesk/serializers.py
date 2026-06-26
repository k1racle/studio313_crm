from rest_framework import serializers
from .models import HelpdeskTicket, TicketComment
from apps.users.serializers import UserSerializer


class TicketCommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = TicketComment
        fields = ['id', 'ticket', 'author', 'text', 'is_internal', 'created_at']
        read_only_fields = ['ticket', 'author']


class HelpdeskTicketSerializer(serializers.ModelSerializer):
    assignee = UserSerializer(read_only=True)
    assignee_id = serializers.PrimaryKeyRelatedField(
        source='assignee',
        queryset=HelpdeskTicket._meta.get_field('assignee').related_model.objects.all(),
        required=False,
        allow_null=True,
        write_only=True
    )
    comments = TicketCommentSerializer(many=True, read_only=True)

    class Meta:
        model = HelpdeskTicket
        fields = [
            'id', 'subject', 'description', 'status', 'priority', 'source', 'category',
            'requester_name', 'requester_contact', 'assignee', 'assignee_id',
            'comments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
