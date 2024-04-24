from django.contrib import admin
from .models import Match, Tournament, Participant

# Register your models here.
admin.site.register(Match)
admin.site.register(Tournament)
admin.site.register(Participant)