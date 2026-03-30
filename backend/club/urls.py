from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TeamViewSet, CoachViewSet, PlayerViewSet,
    ChampionshipViewSet, MatchViewSet, DisciplineViewSet,
    EventTypeViewSet, CalendarEventViewSet, TrainingSessionViewSet, EventAttendanceViewSet
)
from .signed_upload import (
    GeneratePlayerPhotoUploadURL, GenerateTeamPhotoUploadURL, GenerateCoachPhotoUploadURL, GenerateGeneralPhotoUploadURL
)

router = DefaultRouter()
router.register(r'teams', TeamViewSet, basename='teams')
router.register(r'coaches', CoachViewSet, basename='coaches')
router.register(r'players', PlayerViewSet, basename='players')
router.register(r'championships', ChampionshipViewSet, basename='championships')
router.register(r'matches', MatchViewSet, basename='matches')
router.register(r'disciplines', DisciplineViewSet, basename='disciplines')

# Calendar endpoints
router.register(r'calendar/events', CalendarEventViewSet, basename='calendar-events')
router.register(r'calendar/event-types', EventTypeViewSet, basename='event-types')
router.register(r'calendar/trainings', TrainingSessionViewSet, basename='training-sessions')
router.register(r'calendar/attendance', EventAttendanceViewSet, basename='event-attendance')

urlpatterns = [
    path('', include(router.urls)),
    path('register/', __import__('club.views').views.RegisterView.as_view(), name='register'),
    path('upload/player-photo/', GeneratePlayerPhotoUploadURL.as_view(), name='upload_player_photo'),
    path('upload/team-photo/', GenerateTeamPhotoUploadURL.as_view(), name='upload_team_photo'),
    path('upload/coach-photo/', GenerateCoachPhotoUploadURL.as_view(), name='upload_coach_photo'),
    path('upload/general-photo/', GenerateGeneralPhotoUploadURL.as_view(), name='upload_general_photo'),
]
