from django.db import models


class Discipline(models.Model):

    name = models.CharField(max_length=100, unique=True)
    name_en = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    description_en = models.TextField(blank=True, null=True)
    head_coach = models.ForeignKey(
        'Coach', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='disciplines_headed',
        help_text='Head coach for this discipline (optional)'
    )

    def __str__(self):
        return self.name

from django.db import models




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
