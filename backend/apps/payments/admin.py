from django.contrib import admin

from .models import Payment, PaymentPlan, PaymentSettings, PlannedPayment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'booking', 'provider', 'payment_type', 'amount', 'status', 'email_sent_at', 'created_at']
    list_filter = ['provider', 'payment_type', 'status', 'created_at']
    search_fields = ['transaction_id', 'bank_order_id', 'booking__requester_name', 'booking__client__name']


@admin.register(PaymentSettings)
class PaymentSettingsAdmin(admin.ModelAdmin):
    list_display = ['test_mode', 'username', 'base_url']

    def has_add_permission(self, request):
        return not PaymentSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PaymentPlan)
class PaymentPlanAdmin(admin.ModelAdmin):
    list_display = ['title', 'counterparty', 'amount', 'start_date', 'frequency', 'reminder_days', 'is_active']
    list_filter = ['frequency', 'is_active']
    search_fields = ['title', 'counterparty', 'purpose']
    filter_horizontal = ['responsible']


@admin.register(PlannedPayment)
class PlannedPaymentAdmin(admin.ModelAdmin):
    list_display = ['plan', 'due_date', 'amount', 'status', 'paid_at', 'reminder_sent_at']
    list_filter = ['status', 'due_date']
