from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from .models import BlackList
from .serializers import BlackListSerializer
from users.models import User
from rest_framework.response import Response

class BlockUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        blocked_user = get_object_or_404(User, pk=pk)
        blocking_user = request.user.id
        if blocking_user == blocked_user:
            return Response({"error": "You cannot block yourself."}, status=status.HTTP_400_BAD_REQUEST)
        
        if BlackList.objects.filter(blocking_user=blocking_user, blocked_user=blocked_user).exists():
            return Response({"error": "You have already blocked this user."}, status=status.HTTP_400_BAD_REQUEST)
        if BlackList.objects.filter(blocking_user=blocked_user, blocked_user=blocking_user).exists():
            return Response({"error": "The user you're trying to block has already blocked you."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = BlackListSerializer(data={'blocking_user': request.user.id, 'blocked_user': blocked_user.id})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GetBlockedUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        blocking_id = request.user.id
        blocked_id = pk

        try:
            blacklist_entry = BlackList.objects.get(
                blocked_user__id=blocked_id,
                blocking_user__id=blocking_id
            )
            return Response({"blocked": True})
        except BlackList.DoesNotExist:
            try:
                blacklist_entry = BlackList.objects.get(
                    blocked_user__id=blocking_id,
                    blocking_user__id=blocked_id
                )
                return Response({"blocked": True})
            except BlackList.DoesNotExist:
                return Response({"blocked": False})