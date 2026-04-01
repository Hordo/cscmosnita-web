from rest_framework import serializers
from .models import Team, Coach, Player, Championship, Match, Discipline, EventType, CalendarEvent, TrainingSession, EventAttendance

# Discipline Serializer
class DisciplineSerializer(serializers.ModelSerializer):
    head_coach = serializers.StringRelatedField(read_only=True)
    head_coach_id = serializers.PrimaryKeyRelatedField(
        queryset=Coach.objects.all(), source="head_coach", write_only=True, required=False
    )

    class Meta:
        model = Discipline
        fields = '__all__'
        extra_fields = ['head_coach_id']
        def get_fields(self):
            fields = super().get_fields()
            fields['head_coach_id'] = self.fields['head_coach_id']
            return fields





class TeamSerializer(serializers.ModelSerializer):
    photo_url = serializers.CharField(allow_blank=True, allow_null=True, required=False)
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

    # No need for get_photo_url, direct field



class CoachSerializer(serializers.ModelSerializer):
    teams = serializers.SerializerMethodField(read_only=True)
    teams_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source="teams", many=True, write_only=True, required=False
    )
    photo_url = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    is_head_of_discipline = serializers.BooleanField(required=False)


    class Meta:
        model = Coach
        fields = '__all__'
        extra_fields = ['teams_id']
        def get_fields(self):
            fields = super().get_fields()
            fields['teams_id'] = self.fields['teams_id']
            fields['is_head_of_discipline'] = self.fields['is_head_of_discipline']
            return fields

    def get_teams(self, obj):
        return [
            {"id": team.id, "name": team.name} for team in obj.teams.all()
        ]

    # No need for get_photo_url, direct field



class PlayerSerializer(serializers.ModelSerializer):
    team = serializers.StringRelatedField(read_only=True)
    team_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source="team", write_only=True
    )
    photo_url = serializers.CharField(allow_blank=True, allow_null=True, required=False)


    class Meta:
        model = Player
        fields = '__all__'
        extra_fields = ['team_id']
        # Add team_id to fields for input
        def get_fields(self):
            fields = super().get_fields()
            fields['team_id'] = self.fields['team_id']
            return fields

    # No need for get_photo_url, direct field


class ChampionshipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Championship
        fields = '__all__'


class MatchSerializer(serializers.ModelSerializer):
    team_name = serializers.SerializerMethodField(read_only=True)
    team_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source='team', write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = Match
        fields = [
            'id', 'team', 'team_id', 'team_name',
            'date', 'home_team_name', 'away_team_name',
            'home_score', 'away_score', 'youtube_link',
        ]

    def get_team_name(self, obj):
        return obj.team.name if obj.team else None


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


# --- Calendar Serializers ---

class EventTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventType
        fields = '__all__'


class PlayerSimpleSerializer(serializers.ModelSerializer):
    """Simple player serializer for calendar events"""
    class Meta:
        model = Player
        fields = ['id', 'first_name', 'last_name', 'number', 'position']


class CalendarEventSerializer(serializers.ModelSerializer):
    """Full calendar event serializer"""
    event_type = EventTypeSerializer(read_only=True)
    discipline = DisciplineSerializer(read_only=True)
    team = TeamSerializer(read_only=True)
    players = PlayerSimpleSerializer(many=True, read_only=True)
    created_by = serializers.StringRelatedField(read_only=True)
    
    # Write-only fields for creation
    event_type_id = serializers.PrimaryKeyRelatedField(
        queryset=EventType.objects.all(), source="event_type", write_only=True, required=False
    )
    discipline_id = serializers.PrimaryKeyRelatedField(
        queryset=Discipline.objects.all(), source="discipline", write_only=True, required=False
    )
    team_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source="team", write_only=True, required=False
    )
    player_ids = serializers.PrimaryKeyRelatedField(
        queryset=Player.objects.all(), source="players", many=True, write_only=True, required=False
    )

    class Meta:
        model = CalendarEvent
        fields = [
            'id', 'title', 'description', 'event_type', 'discipline', 'team',
            'start_datetime', 'end_datetime', 'all_day', 'location',
            'is_cancelled', 'cancellation_reason', 'players', 'created_by',
            'created_at', 'updated_at',
            # Write-only fields
            'event_type_id', 'discipline_id', 'team_id', 'player_ids'
        ]

    def get_fields(self):
        fields = super().get_fields()
        # Add write-only fields
        fields['event_type_id'] = serializers.PrimaryKeyRelatedField(
            queryset=EventType.objects.all(), source="event_type", write_only=True, required=False
        )
        fields['discipline_id'] = serializers.PrimaryKeyRelatedField(
            queryset=Discipline.objects.all(), source="discipline", write_only=True, required=False
        )
        fields['team_id'] = serializers.PrimaryKeyRelatedField(
            queryset=Team.objects.all(), source="team", write_only=True, required=False
        )
        fields['player_ids'] = serializers.PrimaryKeyRelatedField(
            queryset=Player.objects.all(), source="players", many=True, write_only=True, required=False
        )
        return fields


class CalendarEventCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating calendar events"""
    event_type_id = serializers.PrimaryKeyRelatedField(
        queryset=EventType.objects.all(), source="event_type", write_only=True, required=False
    )
    discipline_id = serializers.PrimaryKeyRelatedField(
        queryset=Discipline.objects.all(), source="discipline", write_only=True, required=False
    )
    team_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source="team", write_only=True, required=False
    )
    player_ids = serializers.PrimaryKeyRelatedField(
        queryset=Player.objects.all(), source="players", many=True, write_only=True, required=False
    )

    class Meta:
        model = CalendarEvent
        fields = [
            'title', 'description', 'event_type_id', 'discipline_id', 'team_id',
            'start_datetime', 'end_datetime', 'all_day', 'location',
            'player_ids'
        ]

    def __init__(self, *args, **kwargs):
        print("=== CalendarEventCreateSerializer.__init__() called ===")
        super().__init__(*args, **kwargs)

    def validate(self, attrs):
        print("=== CalendarEventCreateSerializer.validate() called ===")
        print(f"Validating data: {attrs}")
        
        try:
            # Validate that end_datetime is after start_datetime
            start_time = attrs.get('start_datetime')
            end_time = attrs.get('end_datetime')
            
            if start_time and end_time and start_time >= end_time:
                raise serializers.ValidationError("End time must be after start time")
            
            print("Validation passed")
            return attrs
        except Exception as e:
            print(f"ERROR in validation: {e}")
            print(f"ERROR TYPE: {type(e)}")
            import traceback
            traceback.print_exc()
            raise

    def create(self, validated_data):
        print("=== CalendarEventCreateSerializer.create() called ===")
        print(f"Validated data: {validated_data}")
        
        try:
            # Extract many-to-many data
            players_data = validated_data.pop('players', [])
            print(f"Players to add: {players_data}")
            
            # Remove created_by from validated_data if it's an AnonymousUser
            created_by = validated_data.pop('created_by', None)
            if created_by and not created_by.is_authenticated:
                print(f"Removing AnonymousUser: {created_by}")
                created_by = None
            
            # Create the calendar event
            event = CalendarEvent.objects.create(**validated_data)
            print(f"Created calendar event: {event}")
            
            # Set many-to-many relationships
            if players_data:
                event.players.set(players_data)
                print(f"Set {len(players_data)} players for event")
            
            print(f"Final event: {event}")
            return event
        except Exception as e:
            print(f"ERROR in create(): {e}")
            print(f"ERROR TYPE: {type(e)}")
            import traceback
            traceback.print_exc()
            raise


class TrainingSessionSerializer(serializers.ModelSerializer):
    """Training session serializer with related calendar event"""
    calendar_event = CalendarEventSerializer(read_only=True)
    training_type_display = serializers.CharField(source='get_training_type_display', read_only=True)

    class Meta:
        model = TrainingSession
        fields = '__all__'


class EventAttendanceSerializer(serializers.ModelSerializer):
    """Event attendance serializer"""
    player = PlayerSimpleSerializer(read_only=True)
    calendar_event = CalendarEventSerializer(read_only=True)
    recorded_by = serializers.StringRelatedField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = EventAttendance
        fields = '__all__'


class CalendarEventListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for calendar event lists"""
    event_type = EventTypeSerializer(read_only=True)
    discipline = DisciplineSerializer(read_only=True)
    team = TeamSerializer(read_only=True)
    player_count = serializers.SerializerMethodField()

    class Meta:
        model = CalendarEvent
        fields = [
            'id', 'title', 'start_datetime', 'end_datetime', 'all_day',
            'location', 'is_cancelled', 'event_type', 'discipline', 'team',
            'player_count'
        ]

    def __init__(self, *args, **kwargs):
        print("=== CalendarEventListSerializer.__init__() called ===")
        super().__init__(*args, **kwargs)

    def get_player_count(self, obj):
        print(f"Getting player count for event {obj.id}")
        count = obj.players.count()
        print(f"Player count: {count}")
        return count

    def to_representation(self, instance):
        print(f"Serializing event: {instance.id} - {instance.title}")
        try:
            result = super().to_representation(instance)
            print(f"Successfully serialized event {instance.id}")
            return result
        except Exception as e:
            print(f"ERROR serializing event {instance.id}: {e}")
            print(f"ERROR TYPE: {type(e)}")
            import traceback
            traceback.print_exc()
            raise
