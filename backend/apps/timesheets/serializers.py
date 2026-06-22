from rest_framework import serializers
from .models import TimeEntry
from apps.tasks.serializers import TaskSerializer
from apps.users.serializers import UserSerializer


class TimeEntrySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    task = TaskSerializer(read_only=True)
    task_id = serializers.PrimaryKeyRelatedField(
        source='task',
        queryset=TimeEntry._meta.get_field('task').related_model.objects.all(),
        write_only=True
    )

    class Meta:
        model = TimeEntry
        fields = ['id', 'user', 'task', 'task_id', 'start_time', 'end_time', 'duration_minutes', 'note', 'created_at']
        read_only_fields = ['duration_minutes', 'created_at']
