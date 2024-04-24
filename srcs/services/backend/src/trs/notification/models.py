from django.db import models
from users.models import User

class Notification(models.Model):
    message = models.CharField(max_length=100)
    sender = models.ForeignKey(User, on_delete=models.CASCADE, null=True, related_name="notification_sender")
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, null=True, related_name='notification_recipient')
    def __str__(self):
        return self.message

class PublicRoom(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)

    def __str__(self):
        return self.user.username