# Django imports
from rest_framework.views import APIView
from rest_framework import status, generics
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import ListCreateAPIView, RetrieveAPIView
from rest_framework.response import Response
# Channels
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
# Own imports
from .models import Match, Tournament, Participant
from .serializers import MatchSerializer, TournamentSerializer, ParticipantSerializer
from django.db import transaction
from itertools import combinations
from django.db.models import Q
from django.utils.html import escape
# from notification.models import Notification
# from notification.serializers import NotificationSerializer
# from django.contrib.auth import get_user_model

class PongDashboardView(APIView):
    permission_classes = [IsAuthenticated]

class AllMatchesView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Match.objects.all()
    serializer_class = MatchSerializer

class MatchDetailView(RetrieveAPIView):
    queryset = Match.objects.all()
    serializer_class = MatchSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        id = self.kwargs['pk']
        try:
            return Match.objects.get(pk=id)
        except Match.DoesNotExist:
            raise NotFound("Match not found")

# Message
# create_join -> Create and join match
# join_play -> Join and start the game

class JoinMatchView(APIView):
    permission_classes = [IsAuthenticated]

    def join_user_to_match_lobby(self, action, match_id):
        # Send message using the WebSocket when the match is update
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'matches_group',
            {
                    'type': 'send_match_lobby_notification',
                    'type_message' : 'action',
                    'action': f'{action}',
                    'match_id' : match_id
            }
        )

    def post(self, request):
        # 1. Filter matches that are not part of a tournament
        matches = Match.objects.filter(tournament__isnull=True)
        
        # 2. Filter the oldest 'pending' match
        if matches:
            oldest_pending_match = matches.filter(status='pending').order_by('created_at')

            if oldest_pending_match:
                # print("IF OLDEST PENDING MATCH JOIN MATCH VIEW")
                for match in oldest_pending_match:
                    # print("GOING THRU MATCHES")
                    # 2.1 If the oldest pending match is 'full', post a new match
                    if match.user_1 and match.user_2:
                        # print("MATCH IS FULL")
                        continue
                    else:
                        # print("MATCH PENDINGUND", match.id)
                        # Joining match pending
                        if match.user_1 == None and match.user_2 != request.user:
                            match.user_1 = request.user
                        elif match.user_2 == None and match.user_1 != request.user:
                            match.user_2 = request.user

                        match.save()
                        self.join_user_to_match_lobby('join_play', match.id)
                        # Sending http response
                        serializer = MatchSerializer(match)
                        response_data = {
                            'data': serializer.data,
                            'action': 'join_play',
                            'match_id' : match.id
                        }
                        return Response(response_data, status=status.HTTP_201_CREATED)
        
        # print("CREATE JOIN IN JOINVIEW")
        # Creating new match because there's not pending
        new_match = Match.objects.create(status='pending')
        new_match.user_1 = request.user
        new_match.save()
        
        # self.join_user_to_match_lobby('create_join', new_match.id)
        serializer = MatchSerializer(new_match)

        response_data = {
            'data': serializer.data,
            'action': 'create_join',
            'match_id' : new_match.id
        }

        # Sending http response
        return Response(response_data, status=status.HTTP_201_CREATED)

# TOURNAMENT STUFF
class OpenTournamentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        open_tournaments = Tournament.objects.all()
        # open_tournaments = Tournament.objects.annotate(num_participants=Count('participants')).filter(num_participants__lt=4)
        serializer = TournamentSerializer(open_tournaments, many=True)
        return Response(serializer.data)

class TournamentView(APIView):
    def get(self, request, tournament_id):
        try:
            tournament = Tournament.objects.get(id=tournament_id)
            serializer = TournamentSerializer(tournament)
            matches = Match.objects.filter(tournament=tournament)
            match_serializer = MatchSerializer(matches, many=True)
            tournament_data = serializer.data
            tournament_data['matches'] = match_serializer.data
            return Response(tournament_data)
        except Tournament.DoesNotExist:
            return Response({"error": "Tournament not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CreateTournamentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # print("=> Creating new tournament")
            tournament_name = escape(request.data.get('tournamentName'))

            # Create tournament
            tournament = Tournament.objects.create(name=tournament_name, creator_id=request.user, status='pending')

            # Add creator of the tournament to the actual tournament DUH
            participant = Participant.objects.create(tournament_id=tournament, user_id=request.user)

            serializer = TournamentSerializer(tournament)

            return Response({
                'id': serializer.data['id'],
                'creator_id': serializer.data['creator_id'],
                'name': serializer.data['name'],
                'created_at': serializer.data['created_at'],
                'status': serializer.data['status'],
                'participants': ParticipantSerializer(participant).data,
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class JoinTournamentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, tournament_id):
        try:
            user = request.user
            tournament = Tournament.objects.get(id=tournament_id)

            # Check if the user is already a participant in the tournament
            if tournament.participants.filter(user_id=user).exists():
                return Response({'error': 'You are already a participant in this tournament.'}, status=status.HTTP_400_BAD_REQUEST)

            # Check if the tournament is full (has 4 participants)
            if tournament.participants.count() >= 4:
                return Response({'error': 'This tournament is already full.'}, status=status.HTTP_400_BAD_REQUEST)

            # Create participant entry for the user in the tournament
            # atmoic() if any part of this process fails, all changes made within the transaction will be rolled back
            with transaction.atomic():
                Participant.objects.create(tournament_id=tournament, user_id=user)
                
            # Check if the tournament is complete
            if tournament.participants.count() == 4:
                tournament.status = 'full'
                tournament.save()
                # message = f"The tournament {tournament.name} is now full. Your matches have been created."
                # Notification.objects.create(message=message, recipient=user, sender=user)
                self.create_matches_for_tournament(tournament)

            serializer = TournamentSerializer(tournament)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Tournament.DoesNotExist:
            return Response({'error': 'Tournament not found'}, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def create_matches_for_tournament(self, tournament):
        participants = tournament.participants.all()

        if participants.count() == 4:
            for p1, p2 in combinations(participants, 2):
                # Retrieve User instances
                # user1 = get_user_model().objects.get(username=p1.user_id)
                # user2 = get_user_model().objects.get(username=p2.user_id)
                # user1 = User.objects.get(username=p1.user_id)
                # user2 = User.objects.get(username=p2.user_id)
                # # print(user1, user2)
                Match.objects.create(
                    user_1=p1.user_id,
                    user_2=p2.user_id,
                    tournament=tournament
                )
                # message1 = f"You have a match against {user1.username} in tournament {tournament.name}."
                # message2 = f"You have a match against {user2.username} in tournament {tournament.name}."
                # Notification.objects.create(message=message1, recipient=p2.user_id, sender=user1)
                # Notification.objects.create(message=message2, recipient=p1.user_id, sender=user2)  

class TournamentLeaderboardView(APIView):
    def get(self, request, tournament_id):
        try:
            tournament = Tournament.objects.get(id=tournament_id)
            if tournament.status != 'finished':
                return Response({'error': 'Tournament is not finished yet'}, status=status.HTTP_400_BAD_REQUEST)
            tournament.calculate_winner_and_leaderboard()
            tournament.save()
            leaderboard_data = {
                'tournament_name': tournament.name,
                'winner': tournament.winner.username if tournament.winner else None,
                'leaderboard': tournament.leaderboard,
            }
            return Response(leaderboard_data)
        except Tournament.DoesNotExist:
            return Response({'error': 'Tournament not found'}, status=status.HTTP_404_NOT_FOUND)

class TournamentWinnerView(APIView):
    def get(self, request, tournament_id):
        try:
            tournament = Tournament.objects.get(id=tournament_id)
            if tournament.status != 'finished':
                return Response({'error': 'Tournament is not finished yet'}, status=status.HTTP_400_BAD_REQUEST)
            winner_data = {
                'tournament_name': tournament.name,
                'winner': tournament.winner.username if tournament.winner else None,
            }
            return Response(winner_data)
        except Tournament.DoesNotExist:
            return Response({'error': 'Tournament not found'}, status=status.HTTP_404_NOT_FOUND)

class DeleteAllMatches(APIView):
    def post(self, request, format=None):
        Match.objects.all().delete()
        return Response({'message': 'All items have been deleted'}, status=status.HTTP_204_NO_CONTENT)


class UserMatchView(RetrieveAPIView):
    queryset = Match.objects.all()
    serializer_class = MatchSerializer

    def retrieve(self, request, *args, **kwargs):
        pk = self.kwargs.get('pk')
        matches = self.queryset.filter(Q(user_1=pk, status='completed') | Q(user_2=pk, status='completed'))
        serializer = self.get_serializer(matches, many=True)
        return Response(serializer.data)

class PendingMatchView(RetrieveAPIView):
    queryset = Match.objects.all()
    serializer_class = MatchSerializer

    def retrieve(self, request, *args, **kwargs):
        pk = self.kwargs.get('pk')
        matches = self.queryset.filter(Q(user_1=pk, status='pending') | Q(user_2=pk, status='pending'))
        serializer = self.get_serializer(matches, many=True)
        return Response(serializer.data)


class UserTournamentView(RetrieveAPIView):
    queryset = Tournament.objects.all()
    serializer_class = TournamentSerializer

    def retrieve(self, request, *args, **kwargs):
        pk = self.kwargs.get('pk')
        winner = self.queryset.filter(Q(winner=pk, status='finished'))
        serializer = self.get_serializer(winner, many=True)
        return Response(serializer.data)