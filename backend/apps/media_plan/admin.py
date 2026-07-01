from django.contrib import admin
from .models import Publication, PublicationAttachment


@admin.register(Publication)
class PublicationAdmin(admin.ModelAdmin):
    list_display = ['title', 'platform', 'status', 'publish_at', 'responsible', 'created_by', 'created_at']
    list_filter = ['platform', 'status', 'publish_at']
    search_fields = ['title', 'description']


@admin.register(PublicationAttachment)
class PublicationAttachmentAdmin(admin.ModelAdmin):
    list_display = ['publication', 'caption', 'created_at']
