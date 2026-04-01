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


class Championship(models.Model):
    name = models.CharField(max_length=150)  # e.g. "Liga Juniori U10"
    season = models.CharField(max_length=20, blank=True)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="championships")

    def __str__(self):
        return f"{self.name} - {self.team.name} ({self.season})"


class Match(models.Model):
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True, related_name="matches")
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
