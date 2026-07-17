from rest_framework import serializers
from .models import Contact


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = [
            'id', 'full_name', 'organization', 'position',
            'phone', 'email', 'messengers', 'social_networks',
            'birth_date', 'city', 'quick_communication', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
