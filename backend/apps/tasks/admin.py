from django.contrib import admin
from .models import Task, TaskComment, TaskAttachment, ReviewAssigneeConfig


class TaskCommentInline(admin.TabularInline):
    model = TaskComment
    extra = 0


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'priority', 'assignee', 'creator', 'created_at', 'due_date']
    list_filter = ['status', 'priority', 'source', 'created_at']
    search_fields = ['title', 'description']
    filter_horizontal = ['members']
    inlines = [TaskCommentInline]


@admin.register(TaskAttachment)
class TaskAttachmentAdmin(admin.ModelAdmin):
    list_display = ['task', 'file', 'uploaded_at']


@admin.register(ReviewAssigneeConfig)
class ReviewAssigneeConfigAdmin(admin.ModelAdmin):
    list_display = ['assignee']

    def has_add_permission(self, request):
        return not ReviewAssigneeConfig.objects.exists()
