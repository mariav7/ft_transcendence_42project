from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Notification
from django.contrib.auth import get_user_model

User = get_user_model()

@receiver(post_save, sender=Notification)
def notification_created(sender, instance, created, **kwargs):
    if created:
        sender = instance.sender
        recipient = instance.recipient
        group_name = str(instance.recipient)
        channel_layer = get_channel_layer()

        message = {
            'type': 'send_notification',
            'sender' : str(instance.sender),
            'message': instance.message,
        }
        async_to_sync(channel_layer.group_send)(group_name, message)
