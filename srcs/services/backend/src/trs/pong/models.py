# Django imports
from django.db import models
from django.utils import timezone
from django.core.validators import MaxValueValidator
from django.core.serializers import serialize
from users.models import User

class Tournament(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('full', 'Full'),
        ('playing','Playing'),
        ('finished', 'Finished')
    ]

    id = models.AutoField(primary_key=True)
    creator_id = models.ForeignKey(User, related_name='creator_id', on_delete=models.CASCADE, null=True)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=100, choices=STATUS_CHOICES, default='pending')
    matches_played = models.IntegerField(default=0, validators=[MaxValueValidator(6)])
    winner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='tournament_winner')
    leaderboard = models.JSONField(null=True, blank=True)

    def calculate_winner_and_leaderboard(self):
        matches = self.matches.all()
        user_points = {}
        user_points_against = {}
        user_match_durations = {}
        for match in matches:
            winner = match.user_1 if match.score_user_1 > match.score_user_2 else match.user_2
            loser = match.user_2 if match.score_user_1 > match.score_user_2 else match.user_1
            winner_score = match.score_user_1 if match.score_user_1 > match.score_user_2 else match.score_user_2
            loser_score = match.score_user_2 if match.score_user_1 > match.score_user_2 else match.score_user_1
            user_points[winner] = user_points[winner] + winner_score if winner in user_points else winner_score
            user_points[loser] = user_points[loser] + loser_score if loser in user_points else loser_score

            user_points_against[loser] = user_points_against[loser] + winner_score if loser in user_points_against else winner_score
            user_points_against[winner] = user_points_against[winner] + loser_score if winner in user_points_against else loser_score

            if winner in user_match_durations:
                user_match_durations[winner].append(match.time_elapsed)
            else:
                user_match_durations[winner] = [match.time_elapsed]

        sorted_users = sorted(user_points.items(), key=lambda x: (x[1], user_points_against.get(x[0], 0), -sum(user_match_durations.get(x[0], []))), reverse=True)

        leaderboard = []
        for rank, (user, points) in enumerate(sorted_users, start=1):
            user_durations = user_match_durations.get(user, []) 
            total_duration = sum(user_durations)
            total_points_against = user_points_against.get(user, 0)
            # print(user.pk)
            leaderboard.append({
                'rank': rank,
                'user_id': str(user.pk),
                'username': str(user.username),
                'points': points,
                'total_points_against': total_points_against,
                'total_duration': total_duration
            })
        
        # # print(leaderboard)

        if sorted_users:
            winner_user, winner_points = sorted_users[0]
            self.winner = winner_user
        self.leaderboard = leaderboard
        self.save()

class Participant(models.Model):
    id = models.AutoField(primary_key=True)
    tournament_id = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='participants')
    user_id = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.tournament_id} - {self.user_id}"

class Match(models.Model):
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('joined', 'Joined'),
        ('playing','Playing'),
        ('completed', 'Completed'),
        ('aborted', 'Aborted')
    ]

    status = models.CharField(max_length=100, choices=STATUS_CHOICES, default='pending')
    user_1 = models.ForeignKey(User, on_delete=models.CASCADE, null=True, related_name='matches_as_player_1')
    user_2 = models.ForeignKey(User, on_delete=models.CASCADE, null=True, related_name='matches_as_player_2')
    winner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='matches_won')
    loser = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='matches_lost')
    score_user_1 = models.IntegerField(default=0)
    score_user_2 = models.IntegerField(default=0)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, null=True, related_name='matches')
    created_at = models.DateTimeField(default=timezone.now)
    time_elapsed = models.IntegerField(default=0)
