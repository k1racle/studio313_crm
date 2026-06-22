from rest_framework import serializers
from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id', 'name', 'phone', 'email', 'telegram', 'notes', 'is_archived', 'created_at', 'updated_at']


class ClientDetailSerializer(serializers.ModelSerializer):
    bookings = serializers.SerializerMethodField()
    tasks = serializers.SerializerMethodField()
    projects = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = ['id', 'name', 'phone', 'email', 'telegram', 'notes', 'is_archived', 'created_at', 'updated_at', 'bookings', 'tasks', 'projects']

    def get_bookings(self, obj):
        return [
            {
                'id': b['id'],
                'start_time': b['start_time'],
                'status': b['status'],
                'service': {
                    'name': b['service__name'],
                    'price': b['service__price'],
                },
            }
            for b in obj.bookings.all().order_by('-start_time').values('id', 'service__name', 'start_time', 'status', 'service__price')
        ]

    def get_tasks(self, obj):
        return [
            {
                'id': t['id'],
                'title': t['title'],
                'status': t['status'],
                'priority': t['priority'],
                'due_date': t['due_date'],
                'project': {
                    'name': t['project__name'],
                },
            }
            for t in obj.tasks.filter(is_archived=False).exclude(status__in=['done', 'canceled']).order_by('-created_at').values('id', 'title', 'status', 'priority', 'due_date', 'project__name')
        ]

    def get_projects(self, obj):
        project_ids = (
            obj.tasks.filter(is_archived=False)
            .exclude(status__in=['done', 'canceled'])
            .values_list('project', flat=True)
            .distinct()
        )
        return list(
            __import__('apps.projects.models', fromlist=['Project']).Project.objects
            .filter(id__in=project_ids, is_archived=False)
            .values('id', 'name')
        )
