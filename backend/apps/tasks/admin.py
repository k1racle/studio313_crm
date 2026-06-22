from django.contrib import admin
from .models import Task, TaskComment, TaskAttachment


class TaskCommentInline(admin.TabularInline):
    model = TaskComment
    extra = 0


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'priority', 'assignee', 'creator', 'created_at', 'due_date']
    list_filter = ['status', 'priority', 'source', 'created_at']
    search_fields = ['title', 'description']
    inlines = [TaskCommentInline]


@admin.register(TaskAttachment)
class TaskAttachmentAdmin(admin.ModelAdmin):
    list_display = ['task', 'file', 'uploaded_at']
