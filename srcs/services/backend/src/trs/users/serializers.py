from rest_framework import serializers
from .models import User, Friendship
from rest_framework.permissions import AllowAny
from django.utils.html import escape
import os

# A user serializer will translate python data to JSON data and vice versa
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('username', 'password', 'email', 'id', 'bio', 'profile_pic', 'otp_enabled', 'otp_verified', 'qr_code')
        extra_kwargs = {'password': {'write_only': True}}
    # method to create a new row in the database
    def validate_username(self, value):
        """
        Validate username to ensure it meets specified criteria.
        """
        if len(value) > 100:
            raise serializers.ValidationError("Username must be less than 100 characters.")
        if not all(c in '-_.0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ' for c in value):
            raise serializers.ValidationError("Username must contain only ASCII alphanumerics, hyphens, underscores, or periods.")
        return escape(value)

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class UpdateUserSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=False)
    email = serializers.EmailField(required=False)
    bio = serializers.CharField(required=False)
    profile_pic = serializers.ImageField(required=False)
    otp_enabled = serializers.BooleanField(required=False)

    class Meta:
        model = User
        fields = ('username', 'email', 'bio', 'profile_pic', 'otp_enabled')

    def validate_username(self, value):
        user = self.context['request'].user
        if len(value) > 100:
            raise serializers.ValidationError("Username must be less than 100 characters.")
        if not all(c in '-_.0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ' for c in value):
            raise serializers.ValidationError("Username must contain only ASCII alphanumerics, hyphens, underscores, or periods.")
        if User.objects.exclude(pk=user.pk).filter(username=value).exists():
            raise serializers.ValidationError("This username is already in use.")
        return escape(value)

    def validate_email(self, value):
        user = self.context['request'].user
        if User.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError({"This email is already in use."})
        return escape(value)

    def validate_bio(self, value):
        if len(value) > 100:
            raise serializers.ValidationError("Bio must be less than 100 characters.")
        user = self.context['request'].user
        return escape(value)

    def validate_profile_pic(self, value):
        user = self.context['request'].user
        return value

    def validate_otp_enabled(self, value):
        user = self.context['request'].user
        return value

    def update(self, instance, validated_data):
        user = self.context['request'].user
        if user.pk != instance.pk:
            raise serializers.ValidationError({"authorize": "You dont have permission for this user."})
        instance.username = validated_data.get('username', instance.username)
        instance.email = validated_data.get('email', instance.email)
        instance.bio = validated_data.get('bio', instance.bio)
        profile_pic = validated_data.get('profile_pic')
        instance.otp_enabled = validated_data.get('otp_enabled', instance.otp_enabled)
        if instance.otp_enabled == False:
            instance.otp_verified = False
            if instance.qr_code:
                if os.path.isfile(instance.qr_code.path):
                    os.remove(instance.qr_code.path)
                instance.qr_code = None
        if profile_pic:
            if instance.profile_pic and not user.profile_pic.name.startswith('users/profile_pic/default'):
                if os.path.isfile(user.profile_pic.path):
                    os.remove(user.profile_pic.path)
            instance.profile_pic = profile_pic
        instance.save()

        return instance

class FriendSerializer(serializers.ModelSerializer):
    class Meta:
        model = Friendship
        fields = ('sender', 'recipient')
    def create(self, validated_data):
        sender = validated_data['sender']
        recipient = validated_data['recipient']
        if Friendship.objects.filter(sender=sender, recipient=recipient).exists():
            raise serializers.ValidationError("Friendship already exists.")
        friendship = Friendship.objects.create(sender=sender, recipient=recipient)

        return friendship

class FriendUsernameSerializer(serializers.ModelSerializer):
    sender_username = serializers.ReadOnlyField(source='sender.username')
    sender_id = serializers.ReadOnlyField(source='sender.id')
    recipient_username = serializers.ReadOnlyField(source='recipient.username')
    recipient_id = serializers.ReadOnlyField(source='recipient.id')

    class Meta:
        model = Friendship
        fields = ('sender_username', 'sender_id', 'recipient_username', 'recipient_id')
