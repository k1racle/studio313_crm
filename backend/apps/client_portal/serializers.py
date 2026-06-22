from rest_framework import serializers
from .models import ClientAccessToken


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
