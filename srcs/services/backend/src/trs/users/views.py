from .models import User, Friendship
from users.serializers import UserSerializer, UpdateUserSerializer, FriendSerializer, FriendUsernameSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.views import TokenObtainPairView
from django.shortcuts import get_object_or_404
from django.core.files.base import ContentFile
from django.http import JsonResponse
import pyotp
import qrcode
from io import BytesIO
from django.utils.html import escape

class AllUsersView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        users = User.objects.all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class UserView(APIView):
    permission_classes = (IsAuthenticated,)
    parser_classes = [JSONParser, MultiPartParser]

    def get(self, request):
        serializer = UserSerializer(request.user, many=False)
        return Response(serializer.data, status=status.HTTP_200_OK)

class RegisterUserView(APIView):
    # Anybody can get this
    permission_classes = [AllowAny]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    def post(self, request):
        # if email is already in use
        if User.objects.filter(email=request.data['email']).exists():
            return Response({'error': 'Email already registered'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username=request.data['username']).exists():
            return Response({'error': 'Username already registered'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UpdateProfileView(generics.UpdateAPIView):
    queryset = User.objects.all()
    permission_classes = (IsAuthenticated,)
    serializer_class = UpdateUserSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    def perform_update(self, serializer):
        # Associate the updated image with the user
        profile_pic = self.request.data.get('profile_pic')
        if profile_pic:
            serializer.instance.profile_pic = profile_pic
        serializer.save()

class FriendshipView(APIView):
    permission_classes = (IsAuthenticated,)

    def get_queryset(self, username):
        user = get_object_or_404(User, username=username)
        return Friendship.objects.filter(sender=user) | Friendship.objects.filter(recipient=user)
 
    def get(self, request, username, *args, **kwargs):
        user = get_object_or_404(User, username=username)
        usernombre = user.username
        friendships = self.get_queryset(username=user.username)
        serializer = FriendUsernameSerializer(friendships, many=True)  # Use many=True since it's a queryset

        modified_data = []
        for entry in serializer.data:
            if usernombre in entry.values():
                if (entry['sender_username'] == usernombre):
                    del entry['sender_username']
                    del entry['sender_id']
                elif (entry['recipient_username'] == usernombre):
                    del entry['recipient_username']
                    del entry['recipient_id']
            modified_data.append(entry)
        return Response(modified_data, status=status.HTTP_200_OK)

    def post(self, request, username, *args, **kwargs):
            current_user = request.user
            target_user = get_object_or_404(User, id=username)
            if current_user == target_user:
                return Response({"error": "Cannot add yourself as a friend."}, status=status.HTTP_400_BAD_REQUEST)
            if Friendship.objects.filter(sender=current_user, recipient=target_user).exists():
                return Response({"error": "Friendship already exists."}, status=status.HTTP_400_BAD_REQUEST)
            if Friendship.objects.filter(sender=target_user, recipient=current_user).exists():
                return Response({"error": "Friendship already exists."}, status=status.HTTP_400_BAD_REQUEST)
            serializer = FriendSerializer(data={'sender': current_user.pk, 'recipient': target_user.pk})
            serializer.is_valid(raise_exception=True)
            serializer.save()

            return Response(serializer.data, status=status.HTTP_201_CREATED)


class UserDetailView(RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'


class UserProfileView(RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        id = self.kwargs['pk']
        try:
            return User.objects.get(pk=id)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        
class CheckAuthentication(APIView):
    # authentication_classes = [JWTAuthentication]
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response({'authenticated': True})

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            username = serializer.validated_data.get('username')
            password = serializer.validated_data.get('password')
            otp = serializer.validated_data.get('otp')

            user = User.objects.filter(username=username).first()

            if user:
                if user.check_password(password):
                    # Check if the user has 2FA enabled
                    if user.otp_secret_key:
                        # Verify OTP
                        if self.verify_otp(user.otp_secret_key, otp):
                            # Generate JWT token
                            tokens = super().post(request, *args, **kwargs).data
                            return Response(tokens, status=status.HTTP_200_OK)
                        else:
                            return Response({"detail": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)
                    else:
                        # No 2FA enabled, proceed with JWT token generation
                        tokens = super().post(request, *args, **kwargs).data
                        return Response(tokens, status=status.HTTP_200_OK)
                else:
                    return Response({"detail": "Invalid username or password"}, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({"detail": "Invalid username or password"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def verify_otp(self, secret_key, otp):
        totp = pyotp.TOTP(secret_key)
        return totp.verify(otp)

class OtpUserView(APIView):
    permission_classes = (IsAuthenticated,)
    def post(self, request, *args, **kwargs):
            user = request.user
            user.otp_enabled = True
            secret_key = pyotp.random_base32()
            totp = pyotp.TOTP(secret_key)
            provisioning_uri = totp.provisioning_uri(user.email, issuer_name="PONG")

            # Customize QR code appearance
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=10,
                border=4,
            )
            qr.add_data(provisioning_uri)
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="#ffFF", back_color="black")
            user.otp_key = secret_key
            user.save()
            buffer = BytesIO()
            qr_img.save(buffer, format='PNG')
            buffer.seek(0)
            user.qr_code.save('qr_code.png', ContentFile(buffer.getvalue()))
            return Response({"message": "2FA enabled successfully"}, status=status.HTTP_200_OK)

class VerifyOtpView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        user = request.user
        otp_entered = escape(request.data.get('otp'))  # Input sanitization
        otp_entered = request.data.get('otp')
        secret_key = user.otp_key
        totp = pyotp.TOTP(secret_key)
        otp_generated = totp.now()

        if otp_generated == otp_entered:
            user.otp_verified = True
            user.save()
            return Response({"message": "OTP verification successful"}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)
