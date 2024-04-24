from django.urls import path
from .views import BlockUserView, GetBlockedUserView

urlpatterns = [
    path('block-user/<int:pk>', BlockUserView.as_view(), name='block-user'),
    path('is-blocked/<int:pk>', GetBlockedUserView.as_view(), name='blocked-user'),
]