from rest_framework import viewsets
from .models import Team, Coach, Player, Championship, Match, Discipline, EventType, CalendarEvent, TrainingSession, EventAttendance, Tournament, TournamentGroup, GroupTeam, TournamentMatch, Sponsor, NewsArticle, TeamPhoto, IndividualCompetition, IndividualResult, IndividualRace, IndividualRaceParticipant, SportRaceTemplate, SportAgeCategory
from .serializers import (
    TeamSerializer, CoachSerializer, PlayerSerializer,
    ChampionshipSerializer, MatchSerializer, DisciplineSerializer,
    EventTypeSerializer, CalendarEventSerializer, CalendarEventCreateSerializer,
    TrainingSessionSerializer, EventAttendanceSerializer, CalendarEventListSerializer,
    TournamentListSerializer, TournamentSerializer, TournamentGroupSerializer,
    GroupTeamSerializer, TournamentMatchSerializer, SponsorSerializer,
    NewsArticleSerializer, TeamPhotoSerializer,
    IndividualCompetitionSerializer, IndividualCompetitionListSerializer, IndividualResultSerializer,
    IndividualRaceSerializer, IndividualRaceParticipantSerializer,
    SportRaceTemplateSerializer, SportAgeCategorySerializer
)
from .permissions import (
    IsSuperAdminOrReadOnly, IsSuperAdmin, IsAnyAdminOrReadOnly,
    assert_discipline_write_access, assert_super_admin, get_user_admin_discipline_ids, is_any_admin,
    assert_team_write_access, get_user_admin_team_ids, IsAccountantOrAnyAdminOrReadOnly, is_accountant_admin,
    IsAccountantAdminOrReadOnly
)
from rest_framework.exceptions import PermissionDenied

# Discipline ViewSet
class DisciplineViewSet(viewsets.ModelViewSet):
    queryset = Discipline.objects.all()
    serializer_class = DisciplineSerializer
    permission_classes = [IsSuperAdminOrReadOnly]


class TeamViewSet(viewsets.ModelViewSet):

    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = [IsAnyAdminOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        discipline_slug = self.request.query_params.get("discipline")
        if discipline_slug:
            queryset = queryset.filter(discipline__name__iexact=discipline_slug)
        return queryset

    def perform_create(self, serializer):
        discipline_id = self.request.data.get('discipline_id') or self.request.data.get('discipline')
        assert_discipline_write_access(self.request.user, discipline_id, min_role='head_admin')
        serializer.save()

    def perform_update(self, serializer):
        assert_discipline_write_access(self.request.user, serializer.instance.discipline_id, min_role='head_admin')
        serializer.save()

    def perform_destroy(self, instance):
        assert_discipline_write_access(self.request.user, instance.discipline_id, min_role='head_admin')
        instance.delete()


class CoachViewSet(viewsets.ModelViewSet):
    queryset = Coach.objects.all()
    serializer_class = CoachSerializer
    permission_classes = [IsAnyAdminOrReadOnly]

    def _check_head_admin(self):
        user = self.request.user
        if not user.is_authenticated:
            raise PermissionDenied("Authentication required.")
        if user.is_superuser:
            return
        from .models import UserRole
        if not UserRole.objects.filter(user=user, role='head_admin').exists():
            raise PermissionDenied("Head admin access required to manage coaches.")

    def perform_create(self, serializer):
        self._check_head_admin()
        serializer.save()

    def perform_update(self, serializer):
        self._check_head_admin()
        serializer.save()

    def perform_destroy(self, instance):
        self._check_head_admin()
        instance.delete()


from rest_framework.response import Response
from rest_framework import status
import logging

class PlayerViewSet(viewsets.ModelViewSet):
    serializer_class = PlayerSerializer
    permission_classes = [IsAnyAdminOrReadOnly]

    def get_queryset(self):
        qs = Player.objects.all()
        team_id = self.request.query_params.get('team_id')
        if team_id:
            qs = qs.filter(team_id=team_id)
        return qs

    def _get_discipline_id_from_team(self, team_id):
        if not team_id:
            return None
        try:
            return Team.objects.get(pk=team_id).discipline_id
        except Team.DoesNotExist:
            return None

    def perform_create(self, serializer):
        team_id = self.request.data.get('team_id') or self.request.data.get('team')
        discipline_id = self._get_discipline_id_from_team(team_id)
        assert_discipline_write_access(self.request.user, discipline_id)
        assert_team_write_access(self.request.user, team_id)
        serializer.save()

    def perform_update(self, serializer):
        # Check access for current team
        current_team_id = serializer.instance.team_id if serializer.instance.team else None
        discipline_id = serializer.instance.team.discipline_id if serializer.instance.team else None
        assert_discipline_write_access(self.request.user, discipline_id)
        assert_team_write_access(self.request.user, current_team_id)
        # Also check access if team is being changed
        new_team = serializer.validated_data.get('team')
        if new_team and new_team.id != current_team_id:
            assert_team_write_access(self.request.user, new_team.id)
        serializer.save()

    def perform_destroy(self, instance):
        discipline_id = instance.team.discipline_id if instance.team else None
        assert_discipline_write_access(self.request.user, discipline_id)
        assert_team_write_access(self.request.user, instance.team_id)
        instance.delete()


class ChampionshipViewSet(viewsets.ModelViewSet):
    queryset = Championship.objects.all()
    serializer_class = ChampionshipSerializer
    permission_classes = [IsAnyAdminOrReadOnly]

    def perform_create(self, serializer):
        team = serializer.validated_data.get('team')
        assert_team_write_access(self.request.user, team.id if team else None)
        serializer.save()

    def perform_update(self, serializer):
        new_team = serializer.validated_data.get('team', serializer.instance.team)
        old_team = serializer.instance.team
        # Check access for both old and new team
        assert_team_write_access(self.request.user, old_team.id if old_team else None)
        assert_team_write_access(self.request.user, new_team.id if new_team else None)
        serializer.save()

    def perform_destroy(self, instance):
        assert_team_write_access(self.request.user, instance.team_id)
        instance.delete()


class MatchViewSet(viewsets.ModelViewSet):
    serializer_class = MatchSerializer
    permission_classes = [IsAnyAdminOrReadOnly]

    def get_queryset(self):
        queryset = Match.objects.select_related('team').order_by('-date', '-id')
        team_param = self.request.query_params.get('team_id') or self.request.query_params.get('team')
        if team_param:
            queryset = queryset.filter(team_id=team_param)
        return queryset

    def perform_create(self, serializer):
        team = serializer.validated_data.get('team')
        assert_team_write_access(self.request.user, team.id if team else None)
        serializer.save()

    def perform_update(self, serializer):
        new_team = serializer.validated_data.get('team', serializer.instance.team)
        old_team = serializer.instance.team
        # Check access for both old and new team (team can be None)
        assert_team_write_access(self.request.user, old_team.id if old_team else None)
        assert_team_write_access(self.request.user, new_team.id if new_team else None)
        serializer.save()

    def perform_destroy(self, instance):
        assert_team_write_access(self.request.user, instance.team_id)
        instance.delete()

    def list(self, request, *args, **kwargs):
        team_param = request.query_params.get('team_id') or request.query_params.get('team')
        if not team_param:
            return super().list(request, *args, **kwargs)

        # Return structured response with seasons for team-specific queries
        requested_season = request.query_params.get('season')
        seasons = list(
            Match.objects.filter(team_id=team_param)
            .exclude(season='').exclude(season__isnull=True)
            .values_list('season', flat=True)
            .distinct()
            .order_by('-season')
        )
        active_season = requested_season if requested_season in seasons else (seasons[0] if seasons else None)
        qs = Match.objects.select_related('team').filter(team_id=team_param).order_by('-date', '-id')
        if active_season:
            qs = qs.filter(season=active_season)
        serializer = self.get_serializer(qs, many=True)
        return Response({'matches': serializer.data, 'seasons': seasons, 'activeSeason': active_season})


# --- User Registration API View ---
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from .serializers import RegisterSerializer

class RegisterView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Account created successfully. You can now log in."},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailView(APIView):
    permission_classes = []

    def get(self, request):
        return Response({"detail": "Email verification is not enabled."}, status=status.HTTP_404_NOT_FOUND)


# --- Calendar ViewSets ---

from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter

class EventTypeViewSet(viewsets.ModelViewSet):
    """ViewSet for EventType model"""
    queryset = EventType.objects.all()
    serializer_class = EventTypeSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'name_en']
    ordering_fields = ['name']
    ordering = ['name']


class CalendarEventViewSet(viewsets.ModelViewSet):
    """ViewSet for CalendarEvent model"""
    queryset = CalendarEvent.objects.select_related(
        'event_type', 'discipline', 'team', 'created_by'
    ).prefetch_related('players')
    
    filter_backends = [SearchFilter, OrderingFilter]
    permission_classes = [IsAnyAdminOrReadOnly]
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['start_datetime', 'created_at', 'title']
    ordering = ['-start_datetime']

    def list(self, request, *args, **kwargs):
        print("=== CalendarEventViewSet.list() called ===")
        try:
            queryset = self.filter_queryset(self.get_queryset())
            print(f"Queryset count: {queryset.count()}")
            
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                print(f"Serialized data: {len(serializer.data)} items")
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(queryset, many=True)
            print(f"Returning {len(serializer.data)} events")
            return Response(serializer.data)
        except Exception as e:
            print(f"ERROR in CalendarEventViewSet.list(): {e}")
            print(f"ERROR TYPE: {type(e)}")
            import traceback
            traceback.print_exc()
            raise

    def get_queryset(self):
        print("=== CalendarEventViewSet.get_queryset() called ===")
        try:
            queryset = super().get_queryset()
            print(f"Base queryset count: {queryset.count()}")
            
            # Manual filtering instead of DjangoFilterBackend
            event_type = self.request.query_params.get('event_type')
            discipline = self.request.query_params.get('discipline')
            team = self.request.query_params.get('team')
            is_cancelled = self.request.query_params.get('is_cancelled')
            
            print(f"Filters - event_type: {event_type}, discipline: {discipline}, team: {team}, is_cancelled: {is_cancelled}")
            
            if event_type:
                queryset = queryset.filter(event_type_id=event_type)
                print(f"Filtered by event_type: {event_type}, count: {queryset.count()}")
            if discipline:
                queryset = queryset.filter(discipline_id=discipline)
                print(f"Filtered by discipline: {discipline}, count: {queryset.count()}")
            if team:
                queryset = queryset.filter(team_id=team)
                print(f"Filtered by team: {team}, count: {queryset.count()}")
            if is_cancelled is not None:
                queryset = queryset.filter(is_cancelled=is_cancelled.lower() == 'true')
                print(f"Filtered by is_cancelled: {is_cancelled}, count: {queryset.count()}")

            # Upcoming filter: next N days (default 7), exclude training when no team
            upcoming = self.request.query_params.get('upcoming')
            if upcoming:
                from django.utils import timezone
                import datetime
                now = timezone.now()
                days = 7
                try:
                    days = int(upcoming) if int(upcoming) > 1 else 7
                except (ValueError, TypeError):
                    days = 7
                end = now + datetime.timedelta(days=days)
                queryset = queryset.filter(
                    is_cancelled=False,
                    start_datetime__gte=now,
                    start_datetime__lte=end,
                )
                # Exclude training events when viewing the global feed (no team filter)
                if not team:
                    queryset = queryset.exclude(event_type__name__iexact='training')
                print(f"After upcoming filter ({days}d): {queryset.count()}")

            print(f"Final queryset count: {queryset.count()}")
            return queryset
        except Exception as e:
            print(f"ERROR in get_queryset(): {e}")
            print(f"ERROR TYPE: {type(e)}")
            import traceback
            traceback.print_exc()
            raise

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return CalendarEventCreateSerializer
        elif self.action == 'list':
            return CalendarEventListSerializer
        return CalendarEventSerializer

    def create(self, request, *args, **kwargs):
        print("=== CalendarEventViewSet.create() called ===")
        print(f"Request data: {request.data}")
        print(f"User: {request.user}")
        
        try:
            response = super().create(request, *args, **kwargs)
            print(f"Successfully created event: {response.data}")
            return response
        except Exception as e:
            print(f"ERROR in create(): {e}")
            print(f"ERROR TYPE: {type(e)}")
            import traceback
            traceback.print_exc()
            raise

    def perform_create(self, serializer):
        """Set created_by to current user when creating events and enforce team-level permissions."""
        print("=== perform_create() called ===")
        print(f"Serializer data: {serializer.validated_data}")
        print(f"Current user: {self.request.user}")
        print(f"Is authenticated: {self.request.user.is_authenticated}")

        team = serializer.validated_data.get('team')
        if team:
            assert_team_write_access(self.request.user, team.id)
        else:
            # No team: require at least any admin role
            if not is_any_admin(self.request.user):
                raise PermissionDenied("Admin access required.")

        try:
            # Only set created_by if user is authenticated
            if self.request.user.is_authenticated:
                print(f"Setting created_by to authenticated user: {self.request.user}")
                instance = serializer.save(created_by=self.request.user)
            else:
                print(f"User is not authenticated, created_by will be None")
                instance = serializer.save()
            
            print(f"Created event instance: {instance}")
            return instance
        except Exception as e:
            print(f"ERROR in perform_create(): {e}")
            print(f"ERROR TYPE: {type(e)}")
            import traceback
            traceback.print_exc()
            raise

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming events"""
        from django.utils import timezone
        now = timezone.now()
        upcoming_events = self.get_queryset().filter(start_datetime__gte=now)
        page = self.paginate_queryset(upcoming_events)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_date_range(self, request):
        """Get events within a date range"""
        from django.utils import timezone
        from datetime import datetime
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {"error": "Both start_date and end_date parameters are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            
            events = self.get_queryset().filter(
                start_datetime__gte=start_datetime,
                start_datetime__lte=end_datetime
            )
            
            serializer = self.get_serializer(events, many=True)
            return Response(serializer.data)
            
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use ISO format."},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def mark_cancelled(self, request, pk=None):
        """Mark event as cancelled"""
        event = self.get_object()
        cancellation_reason = request.data.get('cancellation_reason', '')

        event.is_cancelled = True
        event.cancellation_reason = cancellation_reason
        event.save()

        serializer = self.get_serializer(event)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='bulk')
    def bulk_create(self, request):
        """Create multiple events at once (used for recurring event series)."""
        if not isinstance(request.data, list):
            return Response({'error': 'Expected a list of events'}, status=status.HTTP_400_BAD_REQUEST)

        created_user = request.user if request.user.is_authenticated else None
        created_ids = []

        for item in request.data:
            serializer = CalendarEventCreateSerializer(data=item)
            serializer.is_valid(raise_exception=True)
            team = serializer.validated_data.get('team')
            if team:
                assert_team_write_access(request.user, team.id)
            elif not is_any_admin(request.user):
                raise PermissionDenied("Admin access required.")
            players_data = serializer.validated_data.pop('players', [])
            event = CalendarEvent.objects.create(created_by=created_user, **serializer.validated_data)
            if players_data:
                event.players.set(players_data)
            created_ids.append(event.id)

        return Response({'created': len(created_ids), 'ids': created_ids}, status=status.HTTP_201_CREATED)
    def perform_update(self, serializer):
        """Enforce team-level permissions on update."""
        instance = serializer.instance
        if instance.team_id:
            assert_team_write_access(self.request.user, instance.team_id)
        elif not is_any_admin(self.request.user):
            raise PermissionDenied("Admin access required.")
        new_team = serializer.validated_data.get('team')
        if new_team and new_team.id != instance.team_id:
            assert_team_write_access(self.request.user, new_team.id)
        serializer.save()

    def perform_destroy(self, instance):
        """Enforce team-level permissions on delete."""
        if instance.team_id:
            assert_team_write_access(self.request.user, instance.team_id)
        elif not is_any_admin(self.request.user):
            raise PermissionDenied("Admin access required.")
        instance.delete()


class TrainingSessionViewSet(viewsets.ModelViewSet):
    """ViewSet for TrainingSession model"""
    queryset = TrainingSession.objects.select_related('calendar_event')
    serializer_class = TrainingSessionSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['objectives', 'notes']
    ordering_fields = ['calendar_event__start_datetime']


# --- NewsArticle ViewSet ---
class NewsArticleViewSet(viewsets.ModelViewSet):
    serializer_class = NewsArticleSerializer
    permission_classes = [IsAccountantOrAnyAdminOrReadOnly]

    def get_queryset(self):
        queryset = NewsArticle.objects.all()
        # Non-admins only see published articles
        if not (is_any_admin(self.request.user) or is_accountant_admin(self.request.user)):
            queryset = queryset.filter(is_published=True)
        slug = self.request.query_params.get('slug')
        if slug:
            queryset = queryset.filter(slug=slug)
        return queryset


class EventAttendanceViewSet(viewsets.ModelViewSet):
    """ViewSet for EventAttendance model"""
    queryset = EventAttendance.objects.select_related('calendar_event', 'player', 'recorded_by')
    serializer_class = EventAttendanceSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['notes']
    ordering_fields = ['recorded_at', 'calendar_event__start_datetime']
    ordering = ['-calendar_event__start_datetime']

    def get_queryset(self):
        queryset = super().get_queryset()
        calendar_event = self.request.query_params.get('calendar_event')
        player = self.request.query_params.get('player')
        status = self.request.query_params.get('status')
        
        if calendar_event:
            queryset = queryset.filter(calendar_event_id=calendar_event)
        if player:
            queryset = queryset.filter(player_id=player)
        if status:
            queryset = queryset.filter(status=status)
            
        return queryset

    def perform_create(self, serializer):
        """Set recorded_by to current user when recording attendance"""
        serializer.save(recorded_by=self.request.user)


# --- Web Push Notification Views ---

import json
from django.conf import settings
from rest_framework.permissions import IsAdminUser
from .models import PushSubscription


def _send_push(subscription: PushSubscription, payload: dict) -> bool:
    """Send a single push notification. Returns False if subscription is stale."""
    try:
        from pywebpush import webpush, WebPushException

        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth,
                },
            },
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{settings.VAPID_ADMIN_EMAIL}"},
        )
        return True
    except Exception as exc:
        # HTTP 410 Gone → subscription expired, safe to delete
        response = getattr(exc, "response", None)
        if response is not None and getattr(response, "status_code", None) == 410:
            subscription.delete()
        return False


class PushSendNotificationsView(APIView):
    """Admin-only: send push notifications for upcoming calendar events (next 24h)."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        from django.utils import timezone
        import datetime

        hours_ahead = int(request.data.get("hours_ahead", 24))
        now = timezone.now()
        cutoff = now + datetime.timedelta(hours=hours_ahead)

        events = CalendarEvent.objects.filter(
            start_datetime__gte=now,
            start_datetime__lte=cutoff,
            is_cancelled=False,
        ).select_related("event_type", "team", "discipline")

        subscriptions = list(PushSubscription.objects.all())
        sent = 0
        failed = 0

        for event in events:
            details = []
            if event.team:
                details.append(event.team.name)
            if event.location:
                details.append(event.location)

            payload = {
                "title": event.title,
                "body": (
                    f"{event.start_datetime.strftime('%d.%m %H:%M')}"
                    + (f" · {', '.join(details)}" if details else "")
                ),
                "url": "/",
            }

            for sub in subscriptions:
                if _send_push(sub, payload):
                    sent += 1
                else:
                    failed += 1

        return Response({"events": events.count(), "sent": sent, "failed": failed})


# ── Tournament ViewSets ───────────────────────────────────────────────────────

from rest_framework.decorators import action

class TournamentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAnyAdminOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TournamentSerializer
        return TournamentListSerializer

    def get_queryset(self):
        qs = Tournament.objects.select_related('team', 'discipline')
        team_param = self.request.query_params.get('team_id') or self.request.query_params.get('team')
        if team_param:
            qs = qs.filter(team_id=team_param)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        discipline_id = self.request.data.get('discipline') or self.request.data.get('discipline_id')
        assert_discipline_write_access(self.request.user, discipline_id)
        team = serializer.validated_data.get('team')
        if team:
            assert_team_write_access(self.request.user, team.id)
        serializer.save()

    def perform_update(self, serializer):
        assert_discipline_write_access(self.request.user, serializer.instance.discipline_id)
        # Check team access for the current team (or the new team if being changed)
        new_team = serializer.validated_data.get('team', serializer.instance.team)
        team_id = new_team.id if new_team else serializer.instance.team_id
        if team_id:
            assert_team_write_access(self.request.user, team_id)
        serializer.save()

    def perform_destroy(self, instance):
        assert_discipline_write_access(self.request.user, instance.discipline_id)
        if instance.team_id:
            assert_team_write_access(self.request.user, instance.team_id)
        instance.delete()


class TournamentGroupViewSet(viewsets.ModelViewSet):
    queryset = TournamentGroup.objects.prefetch_related('group_teams', 'matches')
    serializer_class = TournamentGroupSerializer
    permission_classes = [IsAnyAdminOrReadOnly]

    @action(detail=True, methods=['post'])
    def add_teams(self, request, pk=None):
        """Add teams to group and auto-create all round-robin 0-0 matches."""
        group = self.get_object()
        team_names = request.data.get('team_names', [])

        # Always ensure the tournament's own club team is in the group
        club_team_name = group.tournament.team.name if group.tournament.team else None
        if club_team_name:
            GroupTeam.objects.get_or_create(group=group, team_name=club_team_name)

        for name in team_names:
            GroupTeam.objects.get_or_create(group=group, team_name=name.strip())

        # Build round-robin matches for all teams in the group
        all_teams = list(GroupTeam.objects.filter(group=group))
        existing_pairs = set(
            TournamentMatch.objects.filter(group=group)
            .values_list('home_team_name', 'away_team_name')
        )
        order = TournamentMatch.objects.filter(group=group).count()
        for i, team_a in enumerate(all_teams):
            for team_b in all_teams[i + 1:]:
                if (team_a.team_name, team_b.team_name) not in existing_pairs:
                    TournamentMatch.objects.create(
                        tournament=group.tournament,
                        group=group,
                        stage='group',
                        home_team_name=team_a.team_name,
                        away_team_name=team_b.team_name,
                        home_score=0,
                        away_score=0,
                        match_order=order,
                    )
                    existing_pairs.add((team_a.team_name, team_b.team_name))
                    order += 1

        group.refresh_from_db()
        return Response(TournamentGroupSerializer(group).data)

    @action(detail=True, methods=['post'])
    def recalculate_standings(self, request, pk=None):
        """Recompute W/D/L/GF/GA/Pts for every team in this group from match results."""
        group = self.get_object()
        stats: dict = {}
        for gt in GroupTeam.objects.filter(group=group):
            stats[gt.team_name] = {'obj': gt, 'p': 0, 'w': 0, 'd': 0, 'l': 0, 'gf': 0, 'ga': 0, 'pts': 0}

        for match in TournamentMatch.objects.filter(group=group):
            if match.home_score is None or match.away_score is None:
                continue
            hs, as_ = match.home_score, match.away_score
            for team_name, is_home in [(match.home_team_name, True), (match.away_team_name, False)]:
                if team_name not in stats:
                    continue
                s = stats[team_name]
                s['p'] += 1
                s['gf'] += hs if is_home else as_
                s['ga'] += as_ if is_home else hs
                if hs == as_:
                    s['d'] += 1; s['pts'] += 1
                elif (is_home and hs > as_) or (not is_home and as_ > hs):
                    s['w'] += 1; s['pts'] += 3
                else:
                    s['l'] += 1

        for s in stats.values():
            gt = s['obj']
            gt.played = s['p']; gt.won = s['w']; gt.drawn = s['d']; gt.lost = s['l']
            gt.goals_for = s['gf']; gt.goals_against = s['ga']; gt.points = s['pts']
            gt.save()

        group.refresh_from_db()
        return Response(TournamentGroupSerializer(group).data)


class GroupTeamViewSet(viewsets.ModelViewSet):
    queryset = GroupTeam.objects.all()
    serializer_class = GroupTeamSerializer
    permission_classes = [IsAnyAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        group_id = self.request.query_params.get('group')
        if group_id:
            qs = qs.filter(group_id=group_id)
        return qs


class TournamentMatchViewSet(viewsets.ModelViewSet):
    queryset = TournamentMatch.objects.all()
    serializer_class = TournamentMatchSerializer
    permission_classes = [IsAnyAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        tournament_id = self.request.query_params.get('tournament')
        if tournament_id:
            qs = qs.filter(tournament_id=tournament_id)
        return qs

    def perform_update(self, serializer):
        instance = serializer.save()
        # Auto-recalculate group standings when a group match score changes
        if instance.group_id and ('home_score' in serializer.validated_data or 'away_score' in serializer.validated_data):
            group = instance.group
            stats: dict = {}
            for gt in GroupTeam.objects.filter(group=group):
                stats[gt.team_name] = {'obj': gt, 'p': 0, 'w': 0, 'd': 0, 'l': 0, 'gf': 0, 'ga': 0, 'pts': 0}
            for match in TournamentMatch.objects.filter(group=group):
                if match.home_score is None or match.away_score is None:
                    continue
                hs, as_ = match.home_score, match.away_score
                for team_name, is_home in [(match.home_team_name, True), (match.away_team_name, False)]:
                    if team_name not in stats:
                        continue
                    s = stats[team_name]
                    s['p'] += 1
                    s['gf'] += hs if is_home else as_
                    s['ga'] += as_ if is_home else hs
                    if hs == as_:
                        s['d'] += 1; s['pts'] += 1
                    elif (is_home and hs > as_) or (not is_home and as_ > hs):
                        s['w'] += 1; s['pts'] += 3
                    else:
                        s['l'] += 1
            for s in stats.values():
                gt = s['obj']
                gt.played = s['p']; gt.won = s['w']; gt.drawn = s['d']; gt.lost = s['l']
                gt.goals_for = s['gf']; gt.goals_against = s['ga']; gt.points = s['pts']
                gt.save()


class SponsorViewSet(viewsets.ModelViewSet):
    queryset = Sponsor.objects.all()
    serializer_class = SponsorSerializer
    permission_classes = [IsAccountantAdminOrReadOnly]

    def get_queryset(self):
        qs = Sponsor.objects.all()
        # Show all sponsors to super admins and accountant admins
        if self.request.user and (self.request.user.is_superuser or is_accountant_admin(self.request.user)):
            return qs.order_by('order', 'name')
        # Unauthenticated users only see active sponsors
        if not (self.request.user and self.request.user.is_authenticated):
            qs = qs.filter(is_active=True)
        elif self.request.query_params.get('active') == '1':
            qs = qs.filter(is_active=True)
        return qs.order_by('order', 'name')

# ── User & Role Management ────────────────────────────────────────────────────

from .models import UserRole
from .serializers import UserRoleSerializer, UserWithRolesSerializer
from .permissions import IsSuperAdmin
from django.contrib.auth.models import User as DjangoUser
from rest_framework.views import APIView
from rest_framework.response import Response

class UserListView(APIView):
    """Superuser-only: list all registered users with their roles."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        users = DjangoUser.objects.prefetch_related('club_roles__discipline').order_by('username')
        serializer = UserWithRolesSerializer(users, many=True)
        return Response(serializer.data)


class UserRoleViewSet(viewsets.ModelViewSet):
    """Superuser-only: manage role assignments."""
    queryset = UserRole.objects.select_related('user', 'discipline', 'team').all()
    serializer_class = UserRoleSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs


class SetSuperuserView(APIView):
    """Superuser-only: promote or demote another user's is_superuser flag."""
    permission_classes = [IsSuperAdmin]

    def post(self, request, user_id):
        try:
            target = DjangoUser.objects.get(pk=user_id)
        except DjangoUser.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if target.pk == request.user.pk:
            return Response(
                {'detail': 'You cannot change your own superuser status.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        make_super = bool(request.data.get('is_superuser', False))
        target.is_superuser = make_super
        # is_staff must be True for superusers; clear it when demoting
        target.is_staff = make_super
        target.save(update_fields=['is_superuser', 'is_staff'])

        serializer = UserWithRolesSerializer(target)
        return Response(serializer.data)


# ── Push Subscription View ────────────────────────────────────────────────────

import json as _json

class PushSubscriptionView(APIView):
    """Manage browser Web Push subscriptions.

    POST ?action=subscribe      — upsert subscription + prefs
    POST ?action=get-prefs      — fetch stored prefs for an endpoint
    POST ?action=update-prefs   — update prefs for an existing subscription
    DELETE (no action)          — remove subscription
    """
    permission_classes = []  # Open to anonymous users (subscribers don't need accounts)

    def post(self, request):
        action = request.query_params.get('action')

        if action == 'subscribe':
            endpoint = request.data.get('endpoint')
            keys = request.data.get('keys') or {}
            p256dh = keys.get('p256dh')
            auth_key = keys.get('auth')
            if not endpoint or not p256dh or not auth_key:
                return Response(
                    {'error': 'endpoint, keys.p256dh and keys.auth are required'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            discipline_ids = request.data.get('discipline_ids', [])
            team_ids = request.data.get('team_ids', [])
            PushSubscription.objects.update_or_create(
                endpoint=endpoint,
                defaults={
                    'p256dh': p256dh,
                    'auth': auth_key,
                    'user': request.user if request.user.is_authenticated else None,
                    'discipline_ids': _json.dumps(discipline_ids if isinstance(discipline_ids, list) else []),
                    'team_ids': _json.dumps(team_ids if isinstance(team_ids, list) else []),
                },
            )
            return Response({'ok': True}, status=status.HTTP_201_CREATED)

        elif action == 'get-prefs':
            endpoint = request.data.get('endpoint')
            if not endpoint:
                return Response({'error': 'endpoint is required'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                sub = PushSubscription.objects.get(endpoint=endpoint)
                return Response({
                    'discipline_ids': _json.loads(sub.discipline_ids or '[]'),
                    'team_ids': _json.loads(sub.team_ids or '[]'),
                })
            except PushSubscription.DoesNotExist:
                return Response({'error': 'subscription not found'}, status=status.HTTP_404_NOT_FOUND)

        elif action == 'update-prefs':
            endpoint = request.data.get('endpoint')
            if not endpoint:
                return Response({'error': 'endpoint is required'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                sub = PushSubscription.objects.get(endpoint=endpoint)
                discipline_ids = request.data.get('discipline_ids', [])
                team_ids = request.data.get('team_ids', [])
                sub.discipline_ids = _json.dumps(discipline_ids if isinstance(discipline_ids, list) else [])
                sub.team_ids = _json.dumps(team_ids if isinstance(team_ids, list) else [])
                sub.save()
                return Response({'ok': True})
            except PushSubscription.DoesNotExist:
                return Response({'error': 'subscription not found'}, status=status.HTTP_404_NOT_FOUND)

        return Response({'error': 'unknown action'}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        # DRF parses JSON body for DELETE when Content-Type is application/json
        endpoint = request.data.get('endpoint')
        if not endpoint:
            return Response({'error': 'endpoint is required'}, status=status.HTTP_400_BAD_REQUEST)
        PushSubscription.objects.filter(endpoint=endpoint).delete()
        return Response({'ok': True})


class TeamPhotoViewSet(viewsets.ModelViewSet):
    queryset = TeamPhoto.objects.all()
    serializer_class = TeamPhotoSerializer
    permission_classes = [IsAnyAdminOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        team_id = self.request.query_params.get('team')
        if team_id:
            queryset = queryset.filter(team_id=team_id)
        return queryset

    def perform_create(self, serializer):
        team_id = self.request.data.get('team_id') or self.request.data.get('team')
        assert_team_write_access(self.request.user, team_id)
        serializer.save(uploaded_by=self.request.user)

    def perform_update(self, serializer):
        assert_team_write_access(self.request.user, serializer.instance.team_id)
        serializer.save()

    def perform_destroy(self, instance):
        assert_team_write_access(self.request.user, instance.team_id)
        instance.delete()


# ── Official Documents ────────────────────────────────────────────────────────

from .models import OfficialDocument
from .serializers import OfficialDocumentSerializer
from .permissions import IsAccountantAdminOrReadOnly

class OfficialDocumentViewSet(viewsets.ModelViewSet):
    queryset = OfficialDocument.objects.all()
    serializer_class = OfficialDocumentSerializer
    permission_classes = [IsAccountantAdminOrReadOnly]

    def get_queryset(self):
        qs = OfficialDocument.objects.all()
        doc_type = self.request.query_params.get('type')
        year_param = self.request.query_params.get('year')
        if doc_type:
            qs = qs.filter(document_type=doc_type)
        if year_param:
            try:
                qs = qs.filter(year=int(year_param))
            except (ValueError, TypeError):
                pass
        return qs.order_by('document_type', 'year', 'order', 'name')


# ── Resource Locations & Bookings ─────────────────────────────────────────────

from .models import Location, ResourceBooking
from .serializers import LocationSerializer, ResourceBookingSerializer


class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [IsAccountantAdminOrReadOnly]


class ResourceBookingViewSet(viewsets.ModelViewSet):
    serializer_class = ResourceBookingSerializer
    permission_classes = [IsAccountantAdminOrReadOnly]

    def get_queryset(self):
        qs = ResourceBooking.objects.select_related('location', 'discipline', 'team').all()
        location_id = self.request.query_params.get('location')
        date_from = self.request.query_params.get('from')
        date_to = self.request.query_params.get('to')
        if location_id:
            qs = qs.filter(location_id=location_id)
        if date_from:
            try:
                qs = qs.filter(end_datetime__gte=date_from)
            except (ValueError, TypeError):
                pass
        if date_to:
            try:
                qs = qs.filter(start_datetime__lte=date_to)
            except (ValueError, TypeError):
                pass
        return qs.order_by('start_datetime')

    def destroy(self, request, *args, **kwargs):
        """
        If ?scope=series and instance has recurrence_group, delete all in group.
        Otherwise, delete single instance.
        """
        instance = self.get_object()
        scope = request.query_params.get('scope')
        if scope == 'series' and instance.recurrence_group:
            group = instance.recurrence_group
            count, _ = ResourceBooking.objects.filter(recurrence_group=group).delete()
            from rest_framework.response import Response
            return Response({'deleted': count}, status=200)
        return super().destroy(request, *args, **kwargs)


# ── Individual Sport Competitions ──────────────────────────────────────────

class IndividualCompetitionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAnyAdminOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'list':
            return IndividualCompetitionListSerializer
        return IndividualCompetitionSerializer

    def get_queryset(self):
        qs = IndividualCompetition.objects.select_related('discipline', 'team').prefetch_related('races')
        team_id = self.request.query_params.get('team_id')
        discipline_id = self.request.query_params.get('discipline_id')
        if team_id:
            qs = qs.filter(team_id=team_id)
        if discipline_id:
            qs = qs.filter(discipline_id=discipline_id)
        return qs

    def perform_create(self, serializer):
        team = serializer.validated_data.get('team')
        assert_team_write_access(self.request.user, team.id if team else None)
        # Auto-derive discipline from team when not supplied
        discipline = serializer.validated_data.get('discipline')
        if not discipline and team and team.discipline:
            serializer.save(discipline=team.discipline)
        else:
            serializer.save()

    def perform_update(self, serializer):
        team = serializer.validated_data.get('team', serializer.instance.team)
        assert_team_write_access(self.request.user, team.id if team else None)
        serializer.save()

    def perform_destroy(self, instance):
        assert_team_write_access(self.request.user, instance.team_id)
        instance.delete()


class IndividualResultViewSet(viewsets.ModelViewSet):
    serializer_class = IndividualResultSerializer
    permission_classes = [IsAnyAdminOrReadOnly]

    def get_queryset(self):
        qs = IndividualResult.objects.select_related('competition')
        competition_id = self.request.query_params.get('competition_id')
        if competition_id:
            qs = qs.filter(competition_id=competition_id)
        team_id = self.request.query_params.get('team_id')
        if team_id:
            qs = qs.filter(competition__team_id=team_id)
        return qs

    def _check_access(self, competition):
        assert_team_write_access(self.request.user, competition.team_id if competition else None)

    def perform_create(self, serializer):
        competition = serializer.validated_data.get('competition')
        self._check_access(competition)
        serializer.save()

    def perform_update(self, serializer):
        competition = serializer.validated_data.get('competition', serializer.instance.competition)
        self._check_access(competition)
        serializer.save()

    def perform_destroy(self, instance):
        self._check_access(instance.competition)
        instance.delete()


class IndividualRaceViewSet(viewsets.ModelViewSet):
    serializer_class = IndividualRaceSerializer
    permission_classes = [IsAnyAdminOrReadOnly]

    def get_queryset(self):
        qs = IndividualRace.objects.select_related('competition').prefetch_related('participants__player')
        competition_id = self.request.query_params.get('competition_id')
        if competition_id:
            qs = qs.filter(competition_id=competition_id)
        return qs

    def _check_access(self, competition):
        assert_team_write_access(self.request.user, competition.team_id if competition else None)

    def perform_create(self, serializer):
        competition = serializer.validated_data.get('competition')
        self._check_access(competition)
        serializer.save()

    def perform_update(self, serializer):
        competition = serializer.validated_data.get('competition', serializer.instance.competition)
        self._check_access(competition)
        serializer.save()

    def perform_destroy(self, instance):
        self._check_access(instance.competition)
        instance.delete()


class IndividualRaceParticipantViewSet(viewsets.ModelViewSet):
    serializer_class = IndividualRaceParticipantSerializer
    permission_classes = [IsAnyAdminOrReadOnly]

    def get_queryset(self):
        qs = IndividualRaceParticipant.objects.select_related('race__competition', 'player')
        race_id = self.request.query_params.get('race_id')
        if race_id:
            qs = qs.filter(race_id=race_id)
        competition_id = self.request.query_params.get('competition_id')
        if competition_id:
            qs = qs.filter(race__competition_id=competition_id)
        team_id = self.request.query_params.get('team_id')
        if team_id:
            qs = qs.filter(race__competition__team_id=team_id)
        return qs

    def _check_access(self, race):
        assert_team_write_access(self.request.user, race.competition.team_id if race else None)

    def perform_create(self, serializer):
        race = serializer.validated_data.get('race')
        self._check_access(race)
        serializer.save()

    def perform_update(self, serializer):
        race = serializer.validated_data.get('race', serializer.instance.race)
        self._check_access(race)
        serializer.save()

    def perform_destroy(self, instance):
        self._check_access(instance.race)
        instance.delete()


class SportRaceTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = SportRaceTemplateSerializer
    permission_classes = [IsAnyAdminOrReadOnly]

    def get_queryset(self):
        qs = SportRaceTemplate.objects.select_related('discipline')
        discipline_id = self.request.query_params.get('discipline_id')
        if discipline_id:
            qs = qs.filter(discipline_id=discipline_id)
        return qs

    def perform_create(self, serializer):
        discipline = serializer.validated_data.get('discipline')
        assert_discipline_write_access(self.request.user, discipline.id if discipline else None)
        serializer.save()

    def perform_update(self, serializer):
        discipline = serializer.validated_data.get('discipline', serializer.instance.discipline)
        assert_discipline_write_access(self.request.user, discipline.id if discipline else None)
        serializer.save()

    def perform_destroy(self, instance):
        assert_discipline_write_access(self.request.user, instance.discipline_id)
        instance.delete()


class SportAgeCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = SportAgeCategorySerializer
    permission_classes = [IsAnyAdminOrReadOnly]

    def get_queryset(self):
        qs = SportAgeCategory.objects.select_related('discipline')
        discipline_id = self.request.query_params.get('discipline_id')
        if discipline_id:
            qs = qs.filter(discipline_id=discipline_id)
        return qs

    def perform_create(self, serializer):
        discipline = serializer.validated_data.get('discipline')
        assert_discipline_write_access(self.request.user, discipline.id if discipline else None)
        serializer.save()

    def perform_update(self, serializer):
        discipline = serializer.validated_data.get('discipline', serializer.instance.discipline)
        assert_discipline_write_access(self.request.user, discipline.id if discipline else None)
        serializer.save()

    def perform_destroy(self, instance):
        assert_discipline_write_access(self.request.user, instance.discipline_id)
        instance.delete()


# ---------------------------------------------------------------------------
# AI Training Plan
# ---------------------------------------------------------------------------
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import AITrainingPlan


def _enrich_youtube_links(text: str, api_key: str) -> str:
    """
    Replace YouTube search-result links with direct watch links by calling
    the YouTube Data API v3.  Falls back to the original search URL on any error.
    All lookups run in parallel so total added latency ≈ one API call.
    """
    import re
    from concurrent.futures import ThreadPoolExecutor, as_completed
    import requests as _req

    pattern = r'https://www\.youtube\.com/results\?search_query=([^)\s]+)'
    matches = list(re.finditer(pattern, text))
    if not matches or not api_key:
        return text

    unique_queries = list({m.group(1) for m in matches})

    def lookup(query_encoded: str):
        query = query_encoded.replace('+', ' ')
        try:
            r = _req.get(
                'https://www.googleapis.com/youtube/v3/search',
                params={
                    'part': 'snippet',
                    'q': query,
                    'type': 'video',
                    'maxResults': 1,
                    'key': api_key,
                    'relevanceLanguage': 'en',
                    'safeSearch': 'strict',
                },
                timeout=5,
            )
            items = r.json().get('items', [])
            if items:
                vid = items[0]['id']['videoId']
                return query_encoded, f'https://www.youtube.com/watch?v={vid}'
        except Exception:
            pass
        return query_encoded, None

    replacements: dict = {}
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(lookup, q): q for q in unique_queries}
        for future in as_completed(futures, timeout=8):
            try:
                q, url = future.result()
                if url:
                    replacements[q] = url
            except Exception:
                pass

    def replacer(m):
        return replacements.get(m.group(1), m.group(0))

    return re.sub(pattern, replacer, text)


class AITrainingPlanListView(APIView):
    """
    GET  /api/ai/training-plans/?team_id=<id>   – list plans for a team
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_any_admin(request.user):
            raise PermissionDenied("Admin access required.")
        qs = AITrainingPlan.objects.select_related('team', 'discipline', 'created_by')
        team_id = request.query_params.get('team_id')
        discipline_id = request.query_params.get('discipline_id')
        if team_id:
            qs = qs.filter(team_id=team_id)
        if discipline_id:
            qs = qs.filter(discipline_id=discipline_id)
        qs = qs[:20]  # latest 20
        data = [
            {
                'id': p.id,
                'team_id': p.team_id,
                'team_name': p.team.name if p.team else None,
                'discipline_id': p.discipline_id,
                'discipline_name': p.discipline.name if p.discipline else None,
                'age_label': p.age_label,
                'focus_areas': p.focus_areas,
                'expected_players': p.expected_players,
                'player_range_min': p.player_range_min,
                'player_range_max': p.player_range_max,
                'coach_notes': p.coach_notes,
                'generated_plan': p.generated_plan,
                'followup_notes': p.followup_notes,
                'created_by': p.created_by.username if p.created_by else None,
                'created_at': p.created_at.isoformat(),
            }
            for p in qs
        ]
        return Response(data)


class GenerateTrainingPlanView(APIView):
    """
    POST /api/ai/generate-training/
    Body:
      {
        "team_id": 3,            // optional
        "discipline_id": 1,      // optional
        "age_label": "U10",
        "focus_areas": ["passing", "finishing"],
        "expected_players": 16,
        "player_range_min": 12,
        "player_range_max": 20,
        "coach_notes": "Some kids struggled with long balls last week."
      }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import traceback
        try:
            print("[AI DEBUG] Backend Gemini request payload:")
            print(payload)
            return self._post_inner(request)
        except Exception as _top_exc:
            traceback.print_exc()
            return Response({'error': f'Unhandled server error: {_top_exc}'}, status=500)

    def _post_inner(self, request):
        import os
        import traceback
        import requests as http_requests
        # Debug prints removed

        if not is_any_admin(request.user):
            raise PermissionDenied("Admin access required.")

        gemini_api_key = os.environ.get('GEMINI_API_KEY', '')
        if not gemini_api_key:
            return Response({'error': 'Gemini API key is not configured on the server.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        data = request.data
        team_id = data.get('team_id')
        discipline_id = data.get('discipline_id')
        age_label = (data.get('age_label') or '').strip()
        focus_areas = data.get('focus_areas') or []
        expected_players = int(data.get('expected_players') or 15)
        player_range_min = int(data.get('player_range_min') or max(expected_players - 3, 1))
        player_range_max = int(data.get('player_range_max') or expected_players + 3)

        coach_notes = (data.get('coach_notes') or '').strip()
        duration_minutes = int(data.get('duration_minutes') or 90)
        # Clamp duration between 30 and 300
        if duration_minutes < 30:
            duration_minutes = 30
        if duration_minutes > 300:
            duration_minutes = 300
        language_code = (data.get('language') or 'en').strip().lower()[:2]
        LANGUAGE_NAMES = {'ro': 'Romanian', 'en': 'English', 'de': 'German', 'fr': 'French', 'es': 'Spanish', 'it': 'Italian', 'hu': 'Hungarian'}
        language_name = LANGUAGE_NAMES.get(language_code, 'English')

        if not age_label:
            return Response({'error': 'age_label is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not focus_areas:
            return Response({'error': 'At least one focus area is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Fetch last 5 plans for memory context
        history_qs = AITrainingPlan.objects.all()
        if team_id:
            history_qs = history_qs.filter(team_id=team_id)
        elif discipline_id:
            history_qs = history_qs.filter(discipline_id=discipline_id)
        previous_plans = list(history_qs.order_by('-created_at')[:5])

        # Build the AI prompt
        history_context = ""
        if previous_plans:
            history_lines = []
            for idx, plan in enumerate(reversed(previous_plans), 1):
                session_date = plan.created_at.strftime('%d %b %Y')
                focuses = ', '.join(plan.focus_areas) if plan.focus_areas else 'general'
                snippet = plan.generated_plan[:400].replace('\n', ' ')
                followup = plan.followup_notes[:200].replace('\n', ' ') if plan.followup_notes else ''
                line = f"Session {idx} ({session_date}) — Focus: {focuses}. Summary: {snippet}..."
                if followup:
                    line += f" Follow-up notes: {followup}"
                history_lines.append(line)
            history_context = (
                "\n\nPREVIOUS SESSIONS (most recent last, use these to avoid repetition and build progression):\n"
                + "\n".join(history_lines)
            )

        focus_str = ', '.join(focus_areas)
        team_info = ""
        if team_id:
            try:
                team = Team.objects.get(pk=team_id)
                birth_year = team.year
                if birth_year:
                    import datetime
                    age_approx = datetime.date.today().year - birth_year
                    team_info = f"Team: {team.name} (born ~{birth_year}, approx. {age_approx} years old). "
                else:
                    team_info = f"Team: {team.name}. "
            except Team.DoesNotExist:
                pass

        system_prompt = (
            "You are an expert youth football (soccer) coach and sports educator. "
            "Your role is to design detailed, age-appropriate training sessions for youth teams. "
            "Always structure the session with: warm-up, technical drills, small-sided games, and cool-down. "
            "Include clear coaching points, time allocations, and variations for more or fewer players. "
            f"You MUST respond entirely in {language_name}. Do not use any other language. "
            "For EACH drill or exercise, add a YouTube search link on its own line using this exact markdown format: "
            "[▶ Watch on YouTube](https://www.youtube.com/results?search_query=QUERY) "
            "where QUERY is a URL-encoded English search term: replace every space with a + sign, e.g. 'u9+passing+rondo+football+drill'. "
            "Never include raw spaces inside the parentheses of a markdown URL. "
            "Always use English for the YouTube search query regardless of the response language. "
            f"At the END of the plan, add a short section titled '## Urmărire pentru următoarea sesiune' if Romanian, or '## Follow-up for next session' otherwise, with 2-3 bullet points "
            "about what to consolidate or build upon in the next training. "
            f"The ENTIRE session (including all exercises, warm-up, and cool-down) MUST fit within a total duration of {duration_minutes} minutes. Do NOT exceed this total duration. Distribute time for each exercise accordingly."
        )

        user_message = (
            f"{team_info}"
            f"Age group: {age_label}. "
            f"Focus areas for today: {focus_str}. "
            f"Expected number of players: {expected_players} (plan must also work with {player_range_min}–{player_range_max} players). "
            f"Total training duration: {duration_minutes} minutes."
        )
        if coach_notes:
            user_message += f"\nCoach's additional notes: {coach_notes}"
        user_message += history_context
        user_message += "\n\nPlease generate a complete, detailed training session plan."

        fallback_used = False
        try:
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_api_key}"
            payload = {
                "system_instruction": {"parts": [{"text": system_prompt}]},
                "contents": [{"role": "user", "parts": [{"text": user_message}]}],
                "generationConfig": {"temperature": 0.7},
            }
            resp = http_requests.post(gemini_url, json=payload, timeout=45)
            print(f"[AI DEBUG] Gemini API response status: {resp.status_code}")
            try:
                print(f"[AI DEBUG] Gemini API response body: {resp.text}")
            except Exception as e:
                print(f"[AI DEBUG] Could not print Gemini response body: {e}")
            if resp.status_code == 429:
                try:
                    err_body = resp.json()
                    details = err_body.get('error', {}).get('details', [])
                    found_per_day = False
                    found_per_minute = False
                    for d in details:
                        violations = d.get('violations', [])
                        for v in violations:
                            metric = v.get('quotaMetric', '')
                            if (
                                'per_day' in metric
                                or 'per_project_per_day' in metric
                                or 'free_tier_requests' in metric
                            ):
                                found_per_day = True
                            if 'per_minute' in metric or 'GenerateRequestsPerMinute' in metric or 'InputTokensPerMinute' in metric:
                                found_per_minute = True
                    from datetime import datetime, timedelta
                    import pytz
                    now_utc = datetime.utcnow().replace(tzinfo=pytz.utc)
                    pacific = pytz.timezone('America/Los_Angeles')
                    now_pacific = now_utc.astimezone(pacific)
                    # Per-day quota reset
                    tomorrow_midnight_pacific = (now_pacific + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
                    bucharest = pytz.timezone('Europe/Bucharest')
                    reset_bucharest = tomorrow_midnight_pacific.astimezone(bucharest)
                    reset_time_str = reset_bucharest.strftime('%H:%M, %d %B %Y')
                    # Per-minute quota reset (next minute)
                    next_minute_pacific = (now_pacific + timedelta(minutes=1)).replace(second=0, microsecond=0)
                    reset_minute_bucharest = next_minute_pacific.astimezone(bucharest)
                    reset_minute_str = reset_minute_bucharest.strftime('%H:%M:%S')
                    if found_per_day:
                        error_msg = f"Limita zilnică pentru generarea planurilor AI a fost atinsă. Poți încerca din nou după ora {reset_time_str} (ora României), când se resetează cota."
                        return Response({'error': error_msg, 'quota_reset_bucharest': reset_time_str}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                    elif found_per_minute:
                        error_msg = f"Limita de cereri pe minut a fost atinsă. Poți încerca din nou după ora {reset_minute_str} (ora României). Te rugăm să nu reîncarci sau să apeși de mai multe ori."
                        return Response({'error': error_msg, 'quota_reset_bucharest': reset_minute_str}, status=status.HTTP_429_TOO_MANY_REQUESTS)
                    else:
                        error_msg = 'Prea multe cereri către AI. Încearcă din nou în câteva momente.'
                        return Response({'error': error_msg}, status=status.HTTP_429_TOO_MANY_REQUESTS)
                except Exception as e:
                    return Response({'error': 'AI quota error.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            if resp.status_code == 503:
                return Response(
                    {'error': 'AI service is temporarily unavailable. Please try again in a few minutes.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            if resp.status_code != 200:
                return Response({'error': f'AI service error ({resp.status_code}). Please try again later.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            resp_json = resp.json()
            # Robustly extract generated text from Gemini response
            try:
                candidate = resp_json['candidates'][0]['content']
                if 'parts' in candidate and candidate['parts'] and 'text' in candidate['parts'][0]:
                    generated_text = candidate['parts'][0]['text']
                elif 'text' in candidate:
                    generated_text = candidate['text']
                else:
                    return Response({'error': 'AI service error: Unexpected Gemini response format.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception as parse_exc:
                return Response({'error': f'AI service error: Failed to parse Gemini response: {str(parse_exc)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as exc:
            return Response({'error': f'AI service error: {str(exc)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Enrich YouTube search links → direct watch links (requires YOUTUBE_API_KEY)
        youtube_api_key = os.environ.get('YOUTUBE_API_KEY', '')
        if youtube_api_key:
            generated_text = _enrich_youtube_links(generated_text, youtube_api_key)

        # Extract follow-up notes from the generated text
        followup_notes = ""
        for marker in ["## Urmărire pentru următoarea sesiune", "## Follow-up for next session"]:
            if marker.lower() in generated_text.lower():
                idx = generated_text.lower().index(marker.lower())
                followup_notes = generated_text[idx + len(marker):].strip()
                break

        # Return plan WITHOUT saving — coach must confirm they used the session
        response_data = {
            'generated_plan': generated_text,
            'followup_notes': followup_notes,
            # Echo back the original params so the frontend can send them to /save-training/
            'team_id': team_id,
            'discipline_id': discipline_id,
            'age_label': age_label,
            'focus_areas': focus_areas,
            'expected_players': expected_players,
            'player_range_min': player_range_min,
            'player_range_max': player_range_max,
            'coach_notes': coach_notes,
            'duration_minutes': duration_minutes,
        }
        if fallback_used:
            response_data['ai_fallback'] = 'Gemini 2.0 Flash was used due to daily quota limit on Gemini 2.5 Flash.'
        return Response(response_data, status=status.HTTP_200_OK)


class SaveTrainingPlanView(APIView):
    """
    POST /api/ai/save-training/
    Called by the coach after reviewing the generated plan to confirm it was used.
    Body: same fields returned by GenerateTrainingPlanView
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not is_any_admin(request.user):
            raise PermissionDenied("Admin access required.")

        data = request.data
        generated_plan = (data.get('generated_plan') or '').strip()
        if not generated_plan:
            return Response({'error': 'generated_plan is required.'}, status=status.HTTP_400_BAD_REQUEST)

        team_id = data.get('team_id') or None
        discipline_id = data.get('discipline_id') or None
        age_label = (data.get('age_label') or '').strip()
        focus_areas = data.get('focus_areas') or []
        expected_players = int(data.get('expected_players') or 15)
        player_range_min = int(data.get('player_range_min') or max(expected_players - 3, 1))
        player_range_max = int(data.get('player_range_max') or expected_players + 3)
        coach_notes = (data.get('coach_notes') or '').strip()
        followup_notes = (data.get('followup_notes') or '').strip()

        plan = AITrainingPlan.objects.create(
            team_id=team_id,
            discipline_id=discipline_id,
            age_label=age_label,
            focus_areas=focus_areas,
            expected_players=expected_players,
            player_range_min=player_range_min,
            player_range_max=player_range_max,
            coach_notes=coach_notes,
            generated_plan=generated_plan,
            followup_notes=followup_notes,
            created_by=request.user,
        )

        return Response({
            'id': plan.id,
            'created_at': plan.created_at.isoformat(),
        }, status=status.HTTP_201_CREATED)
