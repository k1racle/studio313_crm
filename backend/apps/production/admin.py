from django.contrib import admin
from .models import Production, ProductionComment, ProductionAttachment


@admin.register(Production)
class ProductionAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'project', 'client', 'assignee', 'due_date', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['title', 'description']


@admin.register(ProductionComment)
class ProductionCommentAdmin(admin.ModelAdmin):
    list_display = ['production', 'author', 'text', 'created_at']


@admin.register(ProductionAttachment)
class ProductionAttachmentAdmin(admin.ModelAdmin):
    list_display = ['production', 'file', 'uploaded_at']
