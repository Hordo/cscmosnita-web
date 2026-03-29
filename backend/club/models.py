from django.db import models

class Discipline(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

from django.db import models



class Team(models.Model):

    name = models.CharField(max_length=100)  # e.g. "U10", "U12", "Seniori"
    age_group = models.CharField(max_length=50, blank=True)  # optional
    season = models.CharField(max_length=20, blank=True)  # e.g. "2024-2025"
    photo_url = models.CharField(max_length=500, blank=True, null=True)
    discipline = models.ForeignKey('Discipline', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.name



class Coach(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    role = models.CharField(max_length=100, blank=True)  # e.g. "Head Coach"
    photo_url = models.CharField(max_length=500, blank=True, null=True)
    teams = models.ManyToManyField(Team, related_name="coaches", blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"



class Player(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    number = models.IntegerField(null=True, blank=True)
    position = models.CharField(max_length=50, blank=True)  # GK, DF, MF, FW
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
    championship = models.ForeignKey(Championship, on_delete=models.CASCADE, related_name="matches")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="matches")

    date = models.DateField()
    home = models.BooleanField(default=True)

    opponent_name = models.CharField(max_length=150)
    our_score = models.IntegerField(null=True, blank=True)
    opponent_score = models.IntegerField(null=True, blank=True)

    youtube_link = models.URLField(blank=True)

    def __str__(self):
        return f"{self.team.name} vs {self.opponent_name} ({self.date})"
