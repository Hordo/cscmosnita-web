from django.db import models
from django.contrib.auth.models import User


class Discipline(models.Model):
    DISCIPLINE_TYPE_CHOICES = [
        ('team', 'Team Sport'),
        ('individual', 'Individual Sport'),
    ]

    name = models.CharField(max_length=100, unique=True)
    name_en = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    description_en = models.TextField(blank=True, null=True)
    discipline_type = models.CharField(
        max_length=20, choices=DISCIPLINE_TYPE_CHOICES, default='team',
        help_text='Team sport (football, basketball) or individual sport (karate, chess, athletics, kempo)'
    )
    head_coach = models.ForeignKey(
        'Coach', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='disciplines_headed',
        help_text='Head coach for this discipline (optional)'
    )

    def __str__(self):
        return self.name




class Team(models.Model):
    name = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100, blank=True, null=True)
    year = models.PositiveIntegerField(blank=True, null=True, help_text="Year of birth for age group (e.g. 2016 for U10 in 2026)")
    photo_url = models.CharField(max_length=500, blank=True, null=True)
    discipline = models.ForeignKey('Discipline', on_delete=models.SET_NULL, null=True, blank=True)

    def save(self, *args, **kwargs):
        # Always keep name_en the same as name
        self.name_en = self.name
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name




class Coach(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=30, blank=True, null=True)
    photo_url = models.CharField(max_length=500, blank=True, null=True)
    teams = models.ManyToManyField(Team, related_name="coaches", blank=True)
    is_head_of_discipline = models.BooleanField(default=False, help_text="Is this coach the head of a discipline?")

    def __str__(self):
        return f"{self.first_name} {self.last_name}"




class Player(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    number = models.IntegerField(null=True, blank=True)
    position = models.CharField(max_length=50, blank=True)
    position_en = models.CharField(max_length=50, blank=True, null=True)
    photo_url = models.CharField(max_length=500, blank=True, null=True)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="players")

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.team.name})"


class Sponsor(models.Model):
    name = models.CharField(max_length=150)
    logo_url = models.CharField(max_length=500, blank=True, null=True, help_text="URL to logo image")
    website_url = models.URLField(blank=True, null=True, help_text="Optional sponsor website")
    order = models.PositiveIntegerField(default=0, help_text="Display order (lower = first)")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.name



class OfficialDocument(models.Model):
    DOCUMENT_TYPE_CHOICES = [
        ('general', 'General'),
        ('yearly', 'Yearly'),
    ]

    name = models.CharField(max_length=200)
    year = models.IntegerField(null=True, blank=True, help_text="Year for yearly documents; null for general documents")
    document_type = models.CharField(max_length=10, choices=DOCUMENT_TYPE_CHOICES, default='yearly')
    file_url = models.CharField(max_length=500, blank=True, null=True, help_text="URL to the PDF document in R2/S3 storage")
    order = models.PositiveIntegerField(default=0, help_text="Display order within the group (lower = first)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['document_type', 'year', 'order', 'name']
        verbose_name = "Official Document"
        verbose_name_plural = "Official Documents"

    def __str__(self):
        year_str = f" ({self.year})" if self.year else " (General)"
        return f"{self.name}{year_str}"

    @property
    def is_available(self):
        return bool(self.file_url)


class Championship(models.Model):
    name = models.CharField(max_length=150)  # e.g. "Liga Juniori U10"
    season = models.CharField(max_length=20, blank=True)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="championships")

    def __str__(self):
        return f"{self.name} - {self.team.name} ({self.season})"


class Match(models.Model):
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True, related_name="matches")
    season = models.CharField(max_length=20, blank=True, help_text="e.g. 2025-2026")
    date = models.DateField(null=True, blank=True)
    home_team_name = models.CharField(max_length=150)
    away_team_name = models.CharField(max_length=150)
    home_score = models.IntegerField(null=True, blank=True)
    away_score = models.IntegerField(null=True, blank=True)
    youtube_link = models.URLField(blank=True)

    def __str__(self):
        score = f"{self.home_score}-{self.away_score}" if self.home_score is not None else "vs"
        return f"{self.home_team_name} {score} {self.away_team_name} ({self.date or 'no date'})"


# Calendar Models
class EventType(models.Model):
    name = models.CharField(max_length=50, unique=True)
    name_en = models.CharField(max_length=50, blank=True, null=True)
    color = models.CharField(max_length=7, default="#007bff", help_text="Hex color code for calendar display")
    icon = models.CharField(max_length=50, blank=True, null=True, help_text="FontAwesome icon class")
    description = models.TextField(blank=True, null=True)
    description_en = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Event Type"
        verbose_name_plural = "Event Types"


class CalendarEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ('training', 'Training'),
        ('match', 'Match'),
        ('meeting', 'Meeting'),
        ('other', 'Other'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    event_type = models.ForeignKey(EventType, on_delete=models.SET_NULL, null=True, blank=True)
    discipline = models.ForeignKey(Discipline, on_delete=models.SET_NULL, null=True, blank=True)
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Date and time
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    all_day = models.BooleanField(default=False)
    
    # Location and details
    location = models.CharField(max_length=200, blank=True, null=True)
    
    # Status
    is_cancelled = models.BooleanField(default=False)
    cancellation_reason = models.TextField(blank=True, null=True)
    
    # Recurrence
    is_recurring = models.BooleanField(default=False)
    recurrence_rule = models.CharField(max_length=10, blank=True, null=True, choices=[
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ])
    recurrence_interval = models.PositiveIntegerField(default=1, null=True, blank=True)
    recurrence_end_date = models.DateField(blank=True, null=True)
    recurrence_group_id = models.UUIDField(blank=True, null=True, db_index=True)

    # Recurrence
    is_recurring = models.BooleanField(default=False)
    recurrence_rule = models.CharField(max_length=10, blank=True, null=True, choices=[
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ])
    recurrence_interval = models.PositiveIntegerField(default=1, null=True, blank=True)
    recurrence_end_date = models.DateField(blank=True, null=True)
    recurrence_group_id = models.UUIDField(blank=True, null=True, db_index=True)

    # Attendance tracking
    players = models.ManyToManyField(Player, blank=True, related_name="calendar_events")
    
    # Metadata
    created_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.start_datetime.date()})"

    class Meta:
        verbose_name = "Calendar Event"
        verbose_name_plural = "Calendar Events"
        ordering = ['-start_datetime']


TOURNAMENT_STAGE_CHOICES = [
    ('group', 'Group Stage'),
    ('r32', 'Round of 32'),
    ('r16', 'Round of 16'),
    ('r8', 'Quarterfinal'),
    ('semi', 'Semifinal'),
    ('third', '3rd Place'),
    ('final', 'Final'),
]


class Tournament(models.Model):
    name = models.CharField(max_length=200)
    season = models.CharField(max_length=20, blank=True)
    date = models.DateField(null=True, blank=True)
    discipline = models.ForeignKey(Discipline, on_delete=models.SET_NULL, null=True, blank=True)
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True, related_name='tournaments')
    has_group_stage = models.BooleanField(default=True)
    # When true, compute the tournament placement for our team using group rankings
    calculate_place_from_groups = models.BooleanField(default=False, help_text='If true and tournament has only group stage, compute placement from group ranking')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.season}) - {self.team}"


class TournamentGroup(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='groups')
    name = models.CharField(max_length=50)  # e.g. "Group A"

    def __str__(self):
        return f"{self.tournament.name} - {self.name}"


class GroupTeam(models.Model):
    group = models.ForeignKey(TournamentGroup, on_delete=models.CASCADE, related_name='group_teams')
    team_name = models.CharField(max_length=150)
    played = models.IntegerField(default=0)
    won = models.IntegerField(default=0)
    drawn = models.IntegerField(default=0)
    lost = models.IntegerField(default=0)
    goals_for = models.IntegerField(default=0)
    goals_against = models.IntegerField(default=0)
    points = models.IntegerField(default=0)
    # Whether to show detailed group stats for this team on the public tournament view
    show_group_details = models.BooleanField(default=True, help_text='Show full group details (played/w/d/l/goals) for this team')

    class Meta:
        ordering = ['-points', '-goals_for']

    def __str__(self):
        return f"{self.team_name} ({self.group})"


class TournamentMatch(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='tournament_matches')
    group = models.ForeignKey(TournamentGroup, on_delete=models.SET_NULL, null=True, blank=True, related_name='matches')
    stage = models.CharField(max_length=10, choices=TOURNAMENT_STAGE_CHOICES, default='group')
    home_team_name = models.CharField(max_length=150)
    away_team_name = models.CharField(max_length=150)
    home_score = models.IntegerField(null=True, blank=True)
    away_score = models.IntegerField(null=True, blank=True)
    youtube_link = models.URLField(blank=True)
    ended_after_penalties = models.BooleanField(default=False)
    # Whether this match should be shown on the public tournament view page
    visible_on_tournament_page = models.BooleanField(default=True, help_text='Hide this match from the public tournament page when false')
    match_order = models.IntegerField(default=0)

    class Meta:
        ordering = ['match_order']

    def __str__(self):
        score = f"{self.home_score}-{self.away_score}" if self.home_score is not None else "vs"
        return f"[{self.get_stage_display()}] {self.home_team_name} {score} {self.away_team_name}"


class TrainingSession(models.Model):
    """Specific model for training sessions with additional fields"""
    calendar_event = models.OneToOneField(CalendarEvent, on_delete=models.CASCADE, related_name="training_session")
    
    # Training specific fields
    training_type = models.CharField(max_length=50, choices=[
        ('regular', 'Regular Training'),
        ('conditioning', 'Conditioning'),
        ('tactical', 'Tactical'),
        ('technical', 'Technical'),
        ('match_prep', 'Match Preparation'),
    ], default='regular')
    
    objectives = models.TextField(help_text="Training objectives for this session")
    notes = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"Training: {self.calendar_event.title}"

    class Meta:
        verbose_name = "Training Session"
        verbose_name_plural = "Training Sessions"


class EventAttendance(models.Model):
    """Track attendance for calendar events"""
    calendar_event = models.ForeignKey(CalendarEvent, on_delete=models.CASCADE, related_name="attendance_records")
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="attendance_records")
    
    ATTENDANCE_STATUS = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('late', 'Late'),
        ('excused', 'Excused'),
    ]
    
    status = models.CharField(max_length=10, choices=ATTENDANCE_STATUS, default='present')
    notes = models.TextField(blank=True, null=True)
    recorded_at = models.DateTimeField(auto_now_add=True)
    recorded_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.player} - {self.calendar_event} - {self.status}"

    class Meta:
        verbose_name = "Event Attendance"
        verbose_name_plural = "Event Attendance"
        unique_together = ['calendar_event', 'player']


class PushSubscription(models.Model):
    """Stores browser Web Push subscriptions for sending notifications."""
    endpoint = models.TextField(unique=True)
    p256dh = models.TextField()
    auth = models.TextField()
    user = models.ForeignKey(
        'auth.User', on_delete=models.CASCADE,
        null=True, blank=True, related_name='push_subscriptions'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    discipline_ids = models.TextField(default='[]', help_text='JSON array of discipline IDs the subscriber wants notifications for')
    team_ids = models.TextField(default='[]', help_text='JSON array of team IDs the subscriber wants notifications for')

    def __str__(self):
        return f"PushSubscription({self.endpoint[:60]}…)"

    class Meta:
        verbose_name = "Push Subscription"
        verbose_name_plural = "Push Subscriptions"




class NewsArticle(models.Model):
    title = models.CharField(max_length=300)
    title_en = models.CharField(max_length=300, blank=True, null=True)
    body = models.TextField()
    body_en = models.TextField(blank=True, null=True)
    cover_url = models.CharField(max_length=500, blank=True, null=True, help_text="URL to cover image")
    published_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_published = models.BooleanField(default=True)
    slug = models.SlugField(max_length=350, unique=True, blank=True)

    class Meta:
        ordering = ['-published_at']
        verbose_name = "News Article"
        verbose_name_plural = "News Articles"

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            base_slug = slugify(self.title)
            slug = base_slug
            n = 1
            while NewsArticle.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class UserRole(models.Model):
    ROLE_CHOICES = [
        ('head_admin', 'Head Admin'),
        ('coach_admin', 'Coach Admin'),
        ('accountant_admin', 'Accountant Admin'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='club_roles')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    discipline = models.ForeignKey(Discipline, on_delete=models.CASCADE, related_name='user_roles', null=True, blank=True)
    team = models.ForeignKey(
        'Team', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='user_roles',
        help_text='Optional: restrict coach_admin to a specific team. If blank, access covers all teams in the discipline.'
    )

    class Meta:
        unique_together = ('user', 'discipline', 'team')

    def __str__(self):
        team_str = f" ({self.team.name})" if self.team else ""
        discipline_str = self.discipline.name if self.discipline else "No Discipline"
        return f"{self.user.username} - {self.role} - {discipline_str}{team_str}"


class TeamPhoto(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='photos')
    photo_url = models.CharField(max_length=500)
    caption = models.TextField(blank=True, null=True)
    caption_en = models.TextField(blank=True, null=True)
    uploaded_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='team_photos_uploaded')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', '-uploaded_at']

    def __str__(self):
        return f"Photo for {self.team.name} (#{self.id})"




# ── Resource Locations & Bookings ─────────────────────────────────────────────

class Location(models.Model):
    name = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class ResourceBooking(models.Model):
    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='bookings')
    discipline = models.ForeignKey('Discipline', on_delete=models.SET_NULL, null=True, blank=True)
    team = models.ForeignKey('Team', on_delete=models.SET_NULL, null=True, blank=True)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    # New fields for recurrence and external bookings
    is_external = models.BooleanField(default=False)
    external_organizer = models.CharField(max_length=200, blank=True, null=True)
    recurrence_type = models.CharField(
        max_length=16,
        choices=[
            ('daily', 'Daily'),
            ('weekly', 'Weekly'),
            ('biweekly', 'Biweekly'),
            ('monthly', 'Monthly'),
            ('weekdays', 'Weekdays (Mon-Fri)'),
        ],
        blank=True,
        null=True
    )
    recurrence_group = models.UUIDField(blank=True, null=True, db_index=True)

    class Meta:
        ordering = ['start_datetime']

    def __str__(self):
        if self.is_external:
            label = self.external_organizer or 'External'
        else:
            label = self.team.name if self.team else (self.discipline.name if self.discipline else 'Unknown')
        return f"{self.location.name} - {label}"


# ── Individual Sport Competitions ─────────────────────────────────────────────

class IndividualCompetition(models.Model):
    """A competition event for individual sports (karate, chess, athletics, kempo)."""
    name = models.CharField(max_length=200)
    discipline = models.ForeignKey(
        Discipline, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='individual_competitions'
    )
    team = models.ForeignKey(
        Team, on_delete=models.CASCADE,
        related_name='individual_competitions'
    )
    date = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True)
    season = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-id']
        verbose_name = 'Individual Competition'
        verbose_name_plural = 'Individual Competitions'

    def __str__(self):
        return f"{self.name} ({self.season}) - {self.team}"


class IndividualResult(models.Model):
    """An athlete's result in an individual competition."""
    MEDAL_CHOICES = [
        ('gold', 'Gold'),
        ('silver', 'Silver'),
        ('bronze', 'Bronze'),
        ('none', 'None'),
    ]

    competition = models.ForeignKey(
        IndividualCompetition, on_delete=models.CASCADE, related_name='results'
    )
    player = models.ForeignKey(
        'Player', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='individual_results',
        help_text='Registered team player. If set, athlete_name is populated automatically.'
    )
    athlete_name = models.CharField(max_length=150)
    event_category = models.CharField(
        max_length=150, blank=True,
        help_text='e.g. Kata U14, Kumite -55kg, 100m Senior, Rapid U12'
    )
    place = models.PositiveIntegerField(
        null=True, blank=True, help_text='Final placement (1st, 2nd, 3rd…)'
    )
    medal = models.CharField(max_length=10, choices=MEDAL_CHOICES, default='none')
    notes = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ['place', 'athlete_name']
        verbose_name = 'Individual Result'
        verbose_name_plural = 'Individual Results'

    def __str__(self):
        return f"{self.athlete_name} - {self.event_category} ({self.competition.name})"


class IndividualRace(models.Model):
    """A race/event within an individual competition (e.g. Kata U14, 100m Senior)."""
    competition = models.ForeignKey(
        IndividualCompetition, on_delete=models.CASCADE, related_name='races'
    )
    name = models.CharField(max_length=200, help_text='e.g. Kata U14, Kumite -55kg, 100m Senior')
    video_link = models.URLField(blank=True, help_text='Optional YouTube/video link for this race')
    order = models.PositiveIntegerField(default=0, help_text='Display order within the competition')

    class Meta:
        ordering = ['order', 'id']
        verbose_name = 'Individual Race'
        verbose_name_plural = 'Individual Races'

    def __str__(self):
        return f"{self.name} — {self.competition}"


class IndividualRaceParticipant(models.Model):
    """A participant in an individual race, optionally linked to a registered player."""
    race = models.ForeignKey(
        IndividualRace, on_delete=models.CASCADE, related_name='participants'
    )
    player = models.ForeignKey(
        'Player', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='race_participations',
        help_text='Registered team player. If set, athlete_name is auto-populated.'
    )
    athlete_name = models.CharField(max_length=150)
    place = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='1=1st place, 2=2nd place, 3=3rd place, null=other participant'
    )

    class Meta:
        ordering = ['place', 'athlete_name']
        verbose_name = 'Race Participant'
        verbose_name_plural = 'Race Participants'

    def __str__(self):
        place_str = f"#{self.place}" if self.place else "participant"
        return f"{self.athlete_name} ({place_str}) — {self.race}"


class SportRaceTemplate(models.Model):
    """A reusable race/event name template for a discipline (e.g. '50m Sprint', 'Long Jump')."""
    discipline = models.ForeignKey(
        Discipline, on_delete=models.CASCADE,
        related_name='race_templates'
    )
    name = models.CharField(max_length=200, help_text='e.g. 50m, 200m, Long Jump, Kata')
    order = models.PositiveIntegerField(default=0, help_text='Display order')

    class Meta:
        ordering = ['order', 'name']
        verbose_name = 'Sport Race Template'
        verbose_name_plural = 'Sport Race Templates'

    def __str__(self):
        return f"{self.name} ({self.discipline})"


class SportAgeCategory(models.Model):
    """An age/gender category for individual sport competitions (e.g. U9 Boys, U10 Girls)."""
    GENDER_CHOICES = [
        ('boys', 'Boys'),
        ('girls', 'Girls'),
        ('mixed', 'Mixed'),
    ]

    discipline = models.ForeignKey(
        Discipline, on_delete=models.CASCADE,
        related_name='age_categories'
    )
    name = models.CharField(max_length=100, help_text='e.g. U9, U10, U11, Senior')
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='mixed')
    order = models.PositiveIntegerField(default=0, help_text='Display order')

    class Meta:
        ordering = ['order', 'name', 'gender']
        verbose_name = 'Sport Age Category'
        verbose_name_plural = 'Sport Age Categories'

    def __str__(self):
        return f"{self.name} ({self.get_gender_display()}) — {self.discipline}"
