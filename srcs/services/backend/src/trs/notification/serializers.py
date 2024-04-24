from rest_framework import serializers
from .models import PublicRoom, Notification

class PublicRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicRoom
        fields = ['user']

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['message']
    def create(self, validated_data):
        sender = self.context['request'].user
        recipient_id = self.context['request'].data.get('recipient')
        recipient = User.objects.get(pk=recipient_id)
        message = escape(validated_data['message'])
        return Notification.objects.create(message=message, sender=sender, recipient=recipient)