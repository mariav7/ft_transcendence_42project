from django.urls import path
from .views import NotifyUserView, SendNotificationView

urlpatterns = [
    path('invite/', SendNotificationView.as_view(), name='send_notif'),
    path('<str:username>/', NotifyUserView.as_view(), name='notify_user'),
]