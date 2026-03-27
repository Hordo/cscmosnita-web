from rest_framework import viewsets
from .models import Team, Coach, Player, Championship, Match
from .serializers import (
    TeamSerializer, CoachSerializer, PlayerSerializer,
    ChampionshipSerializer, MatchSerializer
)


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer


class CoachViewSet(viewsets.ModelViewSet):
    queryset = Coach.objects.all()
    serializer_class = CoachSerializer


class PlayerViewSet(viewsets.ModelViewSet):
    queryset = Player.objects.all()
    serializer_class = PlayerSerializer


class ChampionshipViewSet(viewsets.ModelViewSet):
    queryset = Championship.objects.all()
    serializer_class = ChampionshipSerializer


class MatchViewSet(viewsets.ModelViewSet):
    queryset = Match.objects.all()
    serializer_class = MatchSerializer


# --- User Registration API View ---
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from .serializers import RegisterSerializer

class RegisterView(APIView):
    permission_classes = []  # Allow any user (including unauthenticated) to access this view

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User created successfully"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
