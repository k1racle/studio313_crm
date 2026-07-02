from django.contrib import admin
from .models import FileFolder, ProjectFile, ProjectLink


@admin.register(FileFolder)
class FileFolderAdmin(admin.ModelAdmin):
    list_display = ['name', 'project', 'parent', 'created_by', 'created_at']
    list_filter = ['project']


@admin.register(ProjectFile)
class ProjectFileAdmin(admin.ModelAdmin):
    list_display = ['name', 'project', 'folder', 'uploaded_by', 'uploaded_at', 'size']
    list_filter = ['project']


@admin.register(ProjectLink)
class ProjectLinkAdmin(admin.ModelAdmin):
    list_display = ['name', 'project', 'folder', 'url', 'created_by', 'created_at']
    list_filter = ['project']
