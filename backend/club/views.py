from rest_framework import viewsets
from .models import Team, Coach, Player, Championship, Match, Discipline, EventType, CalendarEvent, TrainingSession, EventAttendance, Tournament, TournamentGroup, GroupTeam, TournamentMatch, Sponsor
from .serializers import (
    TeamSerializer, CoachSerializer, PlayerSerializer,
    ChampionshipSerializer, MatchSerializer, DisciplineSerializer,
    EventTypeSerializer, CalendarEventSerializer, CalendarEventCreateSerializer,
    TrainingSessionSerializer, EventAttendanceSerializer, CalendarEventListSerializer,
    TournamentListSerializer, TournamentSerializer, TournamentGroupSerializer,
    GroupTeamSerializer, TournamentMatchSerializer, SponsorSerializer
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

    # No file upload handling needed; serializers accept photo_url as string


class CoachViewSet(viewsets.ModelViewSet):
    queryset = Coach.objects.all()
    serializer_class = CoachSerializer

    # No file upload handling needed; serializers accept photo_url as string


from rest_framework.response import Response
from rest_framework import status
import logging

class PlayerViewSet(viewsets.ModelViewSet):
    queryset = Player.objects.all()
    serializer_class = PlayerSerializer

    # No file upload handling needed; serializers accept photo_url as string


class ChampionshipViewSet(viewsets.ModelViewSet):
    queryset = Championship.objects.all()
    serializer_class = ChampionshipSerializer


class MatchViewSet(viewsets.ModelViewSet):
    serializer_class = MatchSerializer

    def get_queryset(self):
        queryset = Match.objects.select_related('team').order_by('-date')
        team_id = self.request.query_params.get('team')
        if team_id:
            queryset = queryset.filter(team_id=team_id)
        return queryset


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
        """Set created_by to current user when creating events"""
        print("=== perform_create() called ===")
        print(f"Serializer data: {serializer.validated_data}")
        print(f"Current user: {self.request.user}")
        print(f"Is authenticated: {self.request.user.is_authenticated}")
        
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
            players_data = serializer.validated_data.pop('players', [])
            event = CalendarEvent.objects.create(created_by=created_user, **serializer.validated_data)
            if players_data:
                event.players.set(players_data)
            created_ids.append(event.id)

        return Response({'created': len(created_ids), 'ids': created_ids}, status=status.HTTP_201_CREATED)


class TrainingSessionViewSet(viewsets.ModelViewSet):
    """ViewSet for TrainingSession model"""
    queryset = TrainingSession.objects.select_related('calendar_event')
    serializer_class = TrainingSessionSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['objectives', 'notes']
    ordering_fields = ['calendar_event__start_datetime']
    ordering = ['-calendar_event__start_datetime']

    def get_queryset(self):
        queryset = super().get_queryset()
        training_type = self.request.query_params.get('training_type')
        
        if training_type:
            queryset = queryset.filter(training_type=training_type)
            
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
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TournamentSerializer
        return TournamentListSerializer

    def get_queryset(self):
        qs = Tournament.objects.select_related('team', 'discipline')
        team_id = self.request.query_params.get('team')
        if team_id:
            qs = qs.filter(team_id=team_id)
        return qs.order_by('-created_at')


class TournamentGroupViewSet(viewsets.ModelViewSet):
    queryset = TournamentGroup.objects.prefetch_related('group_teams', 'matches')
    serializer_class = TournamentGroupSerializer

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

    def get_queryset(self):
        qs = super().get_queryset()
        group_id = self.request.query_params.get('group')
        if group_id:
            qs = qs.filter(group_id=group_id)
        return qs


class TournamentMatchViewSet(viewsets.ModelViewSet):
    queryset = TournamentMatch.objects.all()
    serializer_class = TournamentMatchSerializer

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

    def get_queryset(self):
        qs = super().get_queryset()
        active_only = self.request.query_params.get('active')
        if active_only == '1':
            qs = qs.filter(is_active=True)
        return qs.order_by('order', 'name')
