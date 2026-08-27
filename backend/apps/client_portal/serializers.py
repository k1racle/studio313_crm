from rest_framework import serializers
from .models import ClientAccessToken, MaterialApproval


class ClientAccessTokenSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    url = serializers.SerializerMethodField()

    class Meta:
        model = ClientAccessToken
        fields = ['id', 'client', 'client_name', 'token', 'url', 'expires_at', 'is_active', 'created_at']
        read_only_fields = ['token', 'created_at']
        extra_kwargs = {
            'client': {'write_only': True},
        }

    def get_url(self, obj):
        request = self.context.get('request')
        if request:
            return f"{request.scheme}://{request.get_host()}/portal/{obj.token}"
        return f"/portal/{obj.token}"


class MaterialApprovalSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    production_title = serializers.CharField(source='production.title', read_only=True)
    submitted_by_name = serializers.CharField(source='submitted_by.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = MaterialApproval
        fields = [
            'id', 'client', 'client_name', 'project', 'project_name',
            'production', 'production_title', 'title', 'description',
            'file', 'external_url', 'due_date', 'status', 'status_display',
            'client_comment', 'submitted_by_name', 'responded_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['status', 'client_comment', 'submitted_by_name', 'responded_at', 'created_at', 'updated_at']

    def validate(self, attrs):
        current_file = attrs.get('file') or getattr(self.instance, 'file', None)
        current_url = attrs.get('external_url') or getattr(self.instance, 'external_url', '')
        if not current_file and not current_url:
            raise serializers.ValidationError('Добавьте файл или ссылку на материал')
        return attrs


class MaterialApprovalResponseSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[MaterialApproval.STATUS_APPROVED, MaterialApproval.STATUS_CHANGES_REQUESTED])
    comment = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs['status'] == MaterialApproval.STATUS_CHANGES_REQUESTED and not attrs.get('comment', '').strip():
            raise serializers.ValidationError({'comment': 'Опишите, какие правки необходимы'})
        return attrs
