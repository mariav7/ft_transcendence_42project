from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from django.db import models
from users.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import PublicRoom, Notification
from .serializers import PublicRoomSerializer, NotificationSerializer

class NotifyUserView(APIView):
    def get(self, request, username):
        try:
            user = User.objects.get(username=username)
            public_room = PublicRoom.objects.get(user=user)
            serializer = PublicRoomSerializer(public_room)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except PublicRoom.DoesNotExist:
            return Response({'error': f'{username} is not in the PublicRoom.'})

class SendNotificationView(APIView):
    def post(self, request):
        serializer = NotificationSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            message = serializer.validated_data['message']
            sender_id = request.data.get('sender')
            recipient_id = request.data.get('recipient')
            if sender_id and recipient_id:
                try:
                    sender = User.objects.get(username=sender_id)
                    recipient = User.objects.get(pk=recipient_id)
                    notification = Notification.objects.create(message=message, sender=sender, recipient=recipient)
                    return Response(NotificationSerializer(notification).data, status=status.HTTP_201_CREATED)
                except User.DoesNotExist:
                    return Response({"error": "Sender or recipient does not exist"}, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({"error": "Sender and recipient IDs are required"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

