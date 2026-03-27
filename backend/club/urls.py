from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TeamViewSet, CoachViewSet, PlayerViewSet,
    ChampionshipViewSet, MatchViewSet
)

router = DefaultRouter()
router.register(r'teams', TeamViewSet, basename='teams')
router.register(r'coaches', CoachViewSet, basename='coaches')
router.register(r'players', PlayerViewSet, basename='players')
router.register(r'championships', ChampionshipViewSet, basename='championships')
router.register(r'matches', MatchViewSet, basename='matches')

urlpatterns = [
    path('', include(router.urls)),
]
