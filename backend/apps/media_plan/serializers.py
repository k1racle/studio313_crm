from rest_framework import serializers
from .models import Publication, PublicationAttachment
from apps.users.serializers import UserSerializer


class LinkedTaskSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()


class PublicationAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicationAttachment
        fields = ['id', 'file', 'caption', 'created_at']


class PublicationSerializer(serializers.ModelSerializer):
    responsible = UserSerializer(read_only=True)
    responsible_id = serializers.PrimaryKeyRelatedField(
        source='responsible',
        queryset=Publication._meta.get_field('responsible').related_model.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )
    created_by = UserSerializer(read_only=True)
    attachments = PublicationAttachmentSerializer(many=True, read_only=True)
    linked_task = LinkedTaskSerializer(read_only=True)
    platform_label = serializers.CharField(source='get_platform_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Publication
        fields = [
            'id', 'title', 'description', 'platform', 'platform_label',
            'status', 'status_label', 'publish_at', 'responsible', 'responsible_id',
            'linked_task', 'attachments', 'reminder_sent_at', 'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['reminder_sent_at', 'created_by', 'created_at', 'updated_at']
