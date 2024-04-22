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
        # # print("####INSTANCE.MESSAGE", instance.message, "from", sender, "to", group_name)
        channel_layer = get_channel_layer()

        message = {
            'type': 'send_notification',  # Define the message type
            'sender' : str(instance.sender),
            'message': instance.message,        # Use instance.message as the message content
        }
        async_to_sync(channel_layer.group_send)(group_name, message)
