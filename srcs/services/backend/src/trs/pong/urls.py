from django.urls import path
from .views import PongDashboardView, AllMatchesView, MatchDetailView, JoinMatchView, DeleteAllMatches, CreateTournamentView, OpenTournamentsView, TournamentView, JoinTournamentView, UserMatchView, PendingMatchView, TournamentLeaderboardView, TournamentWinnerView, UserTournamentView

urlpatterns = [
    path('', PongDashboardView.as_view()),
    path('matches/', AllMatchesView.as_view()),
    path('matches/<int:pk>/', MatchDetailView.as_view()),
    path('join_match/', JoinMatchView.as_view()),
    path('delete-all-items/', DeleteAllMatches.as_view()),
    path('create_tournament/', CreateTournamentView.as_view()),
    path('tournaments/', OpenTournamentsView.as_view()),
    path('tournaments/<int:tournament_id>/', TournamentView.as_view(), name='tournament-detail'),
    path('join_tournament/<int:tournament_id>/', JoinTournamentView.as_view()),
    path('user_matches/<int:pk>/', UserMatchView.as_view(), name='user-matches'),
    path('pending_matches/<int:pk>/', PendingMatchView.as_view(), name='pending-matches'),
    path('tournaments/<int:tournament_id>/leaderboard/', TournamentLeaderboardView.as_view(), name='tournament_leaderboard'),
    path('tournaments/<int:tournament_id>/winner/', TournamentWinnerView.as_view(), name='tournament_winner'),
    path('tournaments/wins/<int:pk>/', UserTournamentView.as_view(), name='user_tounament_wins'),
]
