import json, os, jwt
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
from urllib.parse import parse_qs
from users.models import User
from chat.models import Message, BlackList
from chat.serializers import CustomSerializer
from django.utils.html import escape
from django.utils import timezone

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        query_string = self.scope["query_string"]
        token_params = parse_qs(query_string.decode("utf-8")).get("token", [""])[0]
        current_user = await self.get_user_from_token(token_params)
        if current_user:
            current_user_id = current_user.pk
            target = self.scope['url_route']['kwargs']['id']
            self.room_name = (
                f'{current_user_id}_{target}'
                if int(current_user_id) > int(target)
                else f'{target}_{current_user_id}'
            )
            self.room_group_name = f'chat_{self.room_name}'
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()

            unread_messages = await self.get_unread_messages(target)
            for message in unread_messages:
                await self.send_unread_msg(message)
                await self.mark_msg_as_read(message)


    async def send_unread_msg(self, message):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'senderUsername': message.sender.username,
            'message': message.message,
            'time': message.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        }))

    @database_sync_to_async
    def mark_msg_as_read(self, message):
        message.is_read = True
        message.save()

    @database_sync_to_async
    def get_unread_messages(self, target):
        return Message.objects.filter(thread_name=f'chat_{self.room_name}', is_read=False)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        await super().disconnect(close_code)

    async def receive(self, text_data):
        data = json.loads(text_data)
        token = data.get('token', None)

        if token:
            user = await self.get_user_from_token(token)
            if user:
                message = escape(data['message'])
                receiver_id = user.username
                sender = await self.get_user(receiver_id.replace('"', ''))
                if await self.is_blocked(sender, self.room_group_name):
                    message = "Action cannot be completed. User has been blocked."
                    receiver_id = "ERROR"
                    await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'message',
                        'message': message,
                        'senderUsername': receiver_id,
                       
                    },
                    )
                    return
                await self.save_message(sender=sender, message=message, thread_name=self.room_group_name)
                messages = await self.get_messages()
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'message',
                        'message': message,
                        'senderUsername': receiver_id,
                        'messages': messages,
                    },
                )

    async def message(self, event):
            message = event['message']
            username = event['senderUsername']
            timestamp = timezone.now()
            formatted_timestamp = timestamp.strftime('%Y-%m-%d %H:%M:%S')

            await self.send(
                text_data=json.dumps(
                    {
                        'message': message,
                        'senderUsername': username,
                        'time': formatted_timestamp
                    }
                )
            )

    @database_sync_to_async
    def get_user(self, username):
        return get_user_model().objects.filter(username=username).first()

    @database_sync_to_async
    def get_messages(self):
        custom_serializers = CustomSerializer()
        messages = custom_serializers.serialize(
            Message.objects.select_related().filter(thread_name=self.room_group_name),
            fields=(
                'sender__pk',
                'sender__username',
                'message',
                'thread_name',
                'timestamp',
            ),
        )
        return messages

    @database_sync_to_async
    def save_message(self, sender, message, thread_name):
        Message.objects.create(sender=sender, message=message, thread_name=thread_name)

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
    def is_blocked(self, user, thread_name):
        blocking_id = user.id
        blocked_id = self.scope['url_route']['kwargs']['id'] 

        try:
            blacklist_entry = BlackList.objects.get(
                blocked_user__id=blocked_id,
                blocking_user__id=blocking_id
            )
            return True
        except BlackList.DoesNotExist:
            try:
                blacklist_entry = BlackList.objects.get(
                blocked_user__id=blocking_id,
                blocking_user__id=blocked_id
            )
                return True
            except BlackList.DoesNotExist:
                return False
