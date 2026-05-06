from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TeamViewSet, CoachViewSet, PlayerViewSet,
    ChampionshipViewSet, MatchViewSet, DisciplineViewSet,
    EventTypeViewSet, CalendarEventViewSet, TrainingSessionViewSet, EventAttendanceViewSet,
    PushSendNotificationsView, PushSubscriptionView,
    TournamentViewSet, TournamentGroupViewSet, GroupTeamViewSet, TournamentMatchViewSet,
    SponsorViewSet, NewsArticleViewSet,
    RegisterView, VerifyEmailView,
    UserListView, UserRoleViewSet,
)
from .signed_upload import (
    GeneratePlayerPhotoUploadURL, GenerateTeamPhotoUploadURL, GenerateCoachPhotoUploadURL,
    GenerateGeneralPhotoUploadURL, GenerateSponsorLogoUploadURL, GenerateNewsArticleCoverUploadURL
)


router = DefaultRouter()
router.register(r'teams', TeamViewSet, basename='teams')
router.register(r'coaches', CoachViewSet, basename='coaches')
router.register(r'players', PlayerViewSet, basename='players')
router.register(r'championships', ChampionshipViewSet, basename='championships')
router.register(r'matches', MatchViewSet, basename='matches')
router.register(r'disciplines', DisciplineViewSet, basename='disciplines')
# Tournament endpoints
router.register(r'tournaments', TournamentViewSet, basename='tournaments')
router.register(r'tournament-groups', TournamentGroupViewSet, basename='tournament-groups')
router.register(r'group-teams', GroupTeamViewSet, basename='group-teams')
router.register(r'tournament-matches', TournamentMatchViewSet, basename='tournament-matches')
router.register(r'sponsors', SponsorViewSet, basename='sponsors')
# News/Articles endpoint
router.register(r'news', NewsArticleViewSet, basename='news')
# Calendar endpoints
router.register(r'calendar/events', CalendarEventViewSet, basename='calendar-events')
router.register(r'calendar/event-types', EventTypeViewSet, basename='event-types')
router.register(r'calendar/trainings', TrainingSessionViewSet, basename='training-sessions')
router.register(r'calendar/attendance', EventAttendanceViewSet, basename='event-attendance')
# UserRole admin endpoint
router.register(r'admin/user-roles', UserRoleViewSet, basename='user-roles')

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify-email'),
    path('upload/player-photo/', GeneratePlayerPhotoUploadURL.as_view(), name='upload_player_photo'),
    path('upload/team-photo/', GenerateTeamPhotoUploadURL.as_view(), name='upload_team_photo'),
    path('upload/coach-photo/', GenerateCoachPhotoUploadURL.as_view(), name='upload_coach_photo'),
    path('upload/general-photo/', GenerateGeneralPhotoUploadURL.as_view(), name='upload_general_photo'),
    path('upload/sponsor-logo/', GenerateSponsorLogoUploadURL.as_view(), name='upload_sponsor_logo'),
    path('upload/news-cover/', GenerateNewsArticleCoverUploadURL.as_view(), name='upload_news_cover'),
    # Push notification endpoints
    path('push/', PushSubscriptionView.as_view(), name='push_subscription'),
    path('push/send-notifications/', PushSendNotificationsView.as_view(), name='push_send_notifications'),
    path('admin/users/', UserListView.as_view(), name='admin-users'),
]
