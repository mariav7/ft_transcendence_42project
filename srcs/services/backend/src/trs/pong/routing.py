from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/pong/lobby/$', consumers.MatchConsumer.as_asgi()),
    re_path(r'ws/pong/match/(?P<id>\d+)/', consumers.PongConsumer.as_asgi()),
    re_path(r'ws/pong/tournament', consumers.TournamentConsumer.as_asgi()),
    re_path(r'ws/pong/localmatch/(?P<id>\d+)/$', consumers.LocalPongConsumer.as_asgi()),
]
