import json, os, jwt
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
from notification.models import PublicRoom
from asgiref.sync import sync_to_async
from urllib.parse import parse_qs

User = get_user_model()

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        query_string = self.scope["query_string"]
        token_params = parse_qs(query_string.decode("utf-8")).get("token", [""])[0]
        user = await self.get_user_from_token(token_params)
        self.scope['user'] = user
        self.group_name = str(user.username)
        await self.handle_user_connection(user)
        await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
        )
        await self.accept()

    async def receive(self, text_data):
        pass

    async def disconnect(self, close_code):
        user = self.scope.get("user")
        if user :
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
            await sync_to_async(self.handle_user_disconnection)(user)

    async def send_notification(self, event):
        message = event.get('message')
        sender = event.get('sender')
        if message:
            await self.send(text_data=json.dumps({ 'message': message, 'sender': sender}))

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            payload = jwt.decode(token, os.getenv("SECRET_KEY"), algorithms=['HS256'])
            user_id = payload['user_id']
            return User.objects.get(pk=user_id)
        except jwt.ExpiredSignatureError:
            return None
        except (jwt.InvalidTokenError, User.DoesNotExist):
            return None

    @database_sync_to_async
    def handle_user_connection(self, user):
        if not PublicRoom.objects.filter(user=user).exists():
            PublicRoom.objects.create(user=user)

    def handle_user_disconnection(self, user):
        PublicRoom.objects.filter(user=user).delete()
        self.close()
