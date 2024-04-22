from django.db import models
from users.models import User
from django.utils import timezone

class Message(models.Model):
    # User that sends a message
    sender = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    # Chat content
    message = models.TextField(null=True, blank=True)
    # Name of the private room (easier to filter which message to return)
    thread_name = models.CharField(null=True, blank=True, max_length=200)
    # Creation time of the message sent
    timestamp = models.DateTimeField(default=timezone.now)
    is_read = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f'{self.sender.username}-{self.thread_name}' if self.sender else f'{self.message}-{self.thread_name}'

class BlackList(models.Model):
    blocked_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_user')
    blocking_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocking_user')
    def __str__(self):
        return f"{self.blocked_user.id} - {self.blocking_user.id}"