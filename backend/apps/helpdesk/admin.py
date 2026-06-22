from django.contrib import admin
from .models import HelpdeskTicket, TicketComment


class TicketCommentInline(admin.TabularInline):
    model = TicketComment
    extra = 0


@admin.register(HelpdeskTicket)
class HelpdeskTicketAdmin(admin.ModelAdmin):
    list_display = ['subject', 'status', 'priority', 'assignee', 'source', 'created_at']
    list_filter = ['status', 'priority', 'source']
    search_fields = ['subject', 'description', 'requester_name', 'requester_contact']
    inlines = [TicketCommentInline]
