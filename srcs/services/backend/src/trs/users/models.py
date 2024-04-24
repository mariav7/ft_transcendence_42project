from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager

class UserProfileManager(UserManager):
    def create_user(self, email, username, password=None, profile_pic="users/profile_pic/default.png", otp_enabled=False, otp_verified=False):
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, profile_pic=profile_pic, otp_enabled=otp_enabled, otp_verified=False)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password):
        user = self.create_user(email, username, password)
        user.is_superuser = True
        user.is_staff = True
        user.save(using=self._db)

class User(AbstractUser):
    username = models.CharField(max_length=50, unique=True)
    bio = models.TextField(max_length=100, blank=True)
    email = models.EmailField(unique=True, blank=False, null=False)
    otp_enabled = models.BooleanField(default=False, null=True)
    otp_key = models.CharField(max_length=100, blank=True, null=True)
    otp_verified = models.BooleanField(default=False, null=True)
    profile_pic = models.ImageField(upload_to='users/profile_pic/', blank=True, null=True, default="users/profile_pic/default.png")
    totp = models.CharField(max_length=100, blank=True, null=True)
    qr_code = models.ImageField(upload_to='users/qr_code/', blank=True, null=True)
    objects = UserProfileManager()

    def __str__(self):
        return self.username

class Friendship(models.Model):
    sender = models.ForeignKey(
        User, related_name='sender', on_delete=models.CASCADE, null=True)
    recipient = models.ForeignKey(
        User, related_name='recipient', on_delete=models.CASCADE, null=True)
    def __str__(self):
        return f"{self.sender.username} - {self.recipient.username}"
