from django.contrib import admin
from .models import Platform, Publication, PublicationAttachment


@admin.register(Platform)
class PlatformAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    search_fields = ['name', 'slug']


@admin.register(Publication)
class PublicationAdmin(admin.ModelAdmin):
    list_display = ['title', 'display_platforms', 'status', 'publish_at', 'responsible', 'created_by', 'created_at']
    list_filter = ['platforms', 'status', 'publish_at']
    search_fields = ['title', 'description']
    filter_horizontal = ['platforms']

    @admin.display(description='Платформы')
    def display_platforms(self, obj):
        return ', '.join(obj.platforms.values_list('name', flat=True)) or '-'


@admin.register(PublicationAttachment)
class PublicationAttachmentAdmin(admin.ModelAdmin):
    list_display = ['publication', 'caption', 'created_at']
