from django.contrib import admin
from .models import Match, Tournament, Participant

admin.site.register(Match)
admin.site.register(Tournament)
admin.site.register(Participant)