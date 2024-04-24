import os
import django
from django.shortcuts import get_object_or_404
from django.http import Http404

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trs.settings')
django.setup()

from users.models import User

def create_regular_user():
    username = os.getenv("ADMIN")
    try :
        user_exists = get_object_or_404(User, username=username)
    except Http404:
        """Function to create a regular user."""
        email = os.getenv("EMAILADMIN")
        password = os.getenv("PASSADMIN")
        user = User.objects.create_user(username=username, email=email, password=password)
        user.save()

if __name__ == "__main__":
    create_regular_user()