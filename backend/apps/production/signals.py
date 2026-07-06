from django.apps import apps
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Production


@receiver(pre_save, sender=Production)
def detect_review_transition(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = Production.objects.get(pk=instance.pk)
        except Production.DoesNotExist:
            return
        if old.status != instance.status and instance.status == Production.STATUS_REVIEW:
            ReviewAssigneeConfig = apps.get_model('tasks', 'ReviewAssigneeConfig')
            config = ReviewAssigneeConfig.objects.first()
            if config and config.assignee:
                instance._review_assignee_to_add = config.assignee


@receiver(post_save, sender=Production)
def add_review_assignee(sender, instance, created, **kwargs):
    if hasattr(instance, '_review_assignee_to_add'):
        user = instance._review_assignee_to_add
        instance.assignees.add(user)
        del instance._review_assignee_to_add
