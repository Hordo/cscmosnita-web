from rest_framework import viewsets
from .models import Team, Coach, Player, Championship, Match, Discipline
from .serializers import (
    TeamSerializer, CoachSerializer, PlayerSerializer,
    ChampionshipSerializer, MatchSerializer, DisciplineSerializer
)

# Discipline ViewSet
class DisciplineViewSet(viewsets.ModelViewSet):
    queryset = Discipline.objects.all()
    serializer_class = DisciplineSerializer


class TeamViewSet(viewsets.ModelViewSet):

    queryset = Team.objects.all()
    serializer_class = TeamSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        discipline_slug = self.request.query_params.get("discipline")
        if discipline_slug:
            queryset = queryset.filter(discipline__name__iexact=discipline_slug)
        return queryset

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            import traceback
            return Response({"detail": str(e), "trace": traceback.format_exc()}, status=500)

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            import traceback
            return Response({"detail": str(e), "trace": traceback.format_exc()}, status=500)


class CoachViewSet(viewsets.ModelViewSet):
    queryset = Coach.objects.all()
    serializer_class = CoachSerializer

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            import traceback
            return Response({"detail": str(e), "trace": traceback.format_exc()}, status=500)

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            import traceback
            return Response({"detail": str(e), "trace": traceback.format_exc()}, status=500)


from rest_framework.response import Response
from rest_framework import status
import logging

class PlayerViewSet(viewsets.ModelViewSet):
    queryset = Player.objects.all()
    serializer_class = PlayerSerializer

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            import traceback
            return Response({"detail": str(e), "trace": traceback.format_exc()}, status=500)

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            import traceback
            return Response({"detail": str(e), "trace": traceback.format_exc()}, status=500)


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
