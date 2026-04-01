from django.contrib import admin
from .models import Discipline, Match

@admin.register(Discipline)
class DisciplineAdmin(admin.ModelAdmin):
	list_display = ("name", "name_en", "head_coach")
	search_fields = ("name", "name_en")
	list_filter = ("head_coach",)
	fields = ("name", "name_en", "description", "description_en", "head_coach")


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
	list_display = ("home_team_name", "home_score", "away_score", "away_team_name", "date", "team")
	list_filter = ("team",)
	search_fields = ("home_team_name", "away_team_name")
	fields = ("team", "date", "home_team_name", "home_score", "away_score", "away_team_name", "youtube_link")
