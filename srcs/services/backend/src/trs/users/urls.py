from django.urls import path
from . import views
from .views import UserView, RegisterUserView, AllUsersView, UpdateProfileView, FriendshipView, UserDetailView, UserProfileView, CheckAuthentication, OtpUserView, VerifyOtpView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', AllUsersView.as_view()),
    # API implementation
    path('<int:pk>/', UserDetailView.as_view(), name='user_detail'),
    path('<int:pk>/profile/', UserProfileView.as_view(), name='user_profile'),
    path('profile/', UserView.as_view()),
    path('register/', RegisterUserView.as_view()),
    path('otp/', OtpUserView.as_view()),
    path('otp_verify/', VerifyOtpView.as_view()),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('update_profile/<int:pk>/', UpdateProfileView.as_view(), name='update_profile'),
    path('friendship/<str:username>/', FriendshipView.as_view(), name='friendship'),
    # TEST is authenticated for navbar
    path('check-authentication/', CheckAuthentication.as_view(), name='check-authentication'),
]