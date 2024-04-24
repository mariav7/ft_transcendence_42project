from rest_framework import serializers
from .models import Match, Tournament, Participant
from django.utils.html import escape

    # def validate(self, data):
    #     if 'status' not in data or not data['status']:
    #         raise serializers.ValidationError("The 'status' field is mandatory to create a match.")
    #     return data

class MatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Match
        fields = ('id', 'status', 'user_1', 'user_2', 'winner', 'loser', 'score_user_1', 'score_user_2' , 'tournament', 'created_at', 'time_elapsed')

    def validate(self, data):
        if 'status' not in data or not data['status']:
            raise serializers.ValidationError("The 'status' field is mandatory to create a match.")
        if data.get('status') == 'completed' and ('winner' not in data or 'loser' not in data):
            raise serializers.ValidationError("For a completed match, 'winner' and 'loser' must be provided.")
        return data

    def create(self, validated_data):
        new_match_created = Match.objects.create(**validated_data)
        return new_match_created

class ParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Participant
        fields = ['id', 'tournament_id', 'user_id', 'created_at']
    
class TournamentSerializer(serializers.ModelSerializer):
    participants = ParticipantSerializer(many=True, read_only=True)

    class Meta:
        model = Tournament
        fields = ['id', 'creator_id', 'name', 'created_at', 'status', 'participants', 'winner', 'matches']

    def validate(self, data):
        if 'name' not in data or not data['name']:
            raise serializers.ValidationError("The 'name' field is mandatory to create a tournament.")
        return data

    def create(self, validated_data):
        new_tournament_created = Tournament.objects.create(**validated_data)
        return new_tournament_created

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['name'] = escape(data['name'])
        return data