from rest_framework import serializers
from .models import Team, Coach, Player, Championship, Match, Discipline

# Discipline Serializer
class DisciplineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Discipline
        fields = '__all__'





class TeamSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField(read_only=True)
    discipline = serializers.StringRelatedField(read_only=True)
    discipline_id = serializers.PrimaryKeyRelatedField(
        queryset=Discipline.objects.all(), source="discipline", write_only=True, required=False
    )
    coaches = serializers.SerializerMethodField(read_only=True)


    class Meta:
        model = Team
        fields = '__all__'
        extra_fields = ['discipline_id']
        def get_fields(self):
            fields = super().get_fields()
            fields['discipline_id'] = self.fields['discipline_id']
            return fields

    def get_coaches(self, obj):
        return [f"{coach.first_name} {coach.last_name}" for coach in obj.coaches.all()]

    def get_photo_url(self, obj):
        if obj.photo:
            return obj.photo.url
        return None



class CoachSerializer(serializers.ModelSerializer):
    teams = serializers.SerializerMethodField(read_only=True)
    teams_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source="teams", many=True, write_only=True, required=False
    )
    photo_url = serializers.SerializerMethodField(read_only=True)


    class Meta:
        model = Coach
        fields = '__all__'
        extra_fields = ['teams_id']
        def get_fields(self):
            fields = super().get_fields()
            fields['teams_id'] = self.fields['teams_id']
            return fields

    def get_teams(self, obj):
        return [
            {"id": team.id, "name": team.name} for team in obj.teams.all()
        ]

    def get_photo_url(self, obj):
        if obj.photo:
            return obj.photo.url
        return None



class PlayerSerializer(serializers.ModelSerializer):
    team = serializers.StringRelatedField(read_only=True)
    team_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source="team", write_only=True
    )
    photo_url = serializers.SerializerMethodField(read_only=True)


    class Meta:
        model = Player
        fields = '__all__'
        extra_fields = ['team_id']
        # Add team_id to fields for input
        def get_fields(self):
            fields = super().get_fields()
            fields['team_id'] = self.fields['team_id']
            return fields

    def get_photo_url(self, obj):
        if obj.photo:
            return obj.photo.url
        return None


class ChampionshipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Championship
        fields = '__all__'


class MatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Match
        fields = '__all__'


# --- User Registration Serializer ---
from django.contrib.auth.models import User

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ("username", "password")

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"]
        )
        return user
