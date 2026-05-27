from django.contrib import admin
from .models import Discipline, Match, Tournament, TournamentGroup, GroupTeam, TournamentMatch, Sponsor, NewsArticle, AITrainingPlan

@admin.register(Discipline)
class DisciplineAdmin(admin.ModelAdmin):
	list_display = ("name", "name_en", "head_coach")
	search_fields = ("name", "name_en")
	list_filter = ("head_coach",)
	fields = ("name", "name_en", "description", "description_en", "head_coach")


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = ("name", "season", "team", "discipline", "has_group_stage", "calculate_place_from_groups")
    list_filter = ("discipline", "team")
    search_fields = ("name", "season")


@admin.register(TournamentGroup)
class TournamentGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "tournament")


@admin.register(GroupTeam)
class GroupTeamAdmin(admin.ModelAdmin):
    list_display = ("team_name", "group", "points", "played", "won", "drawn", "lost", "show_group_details")


@admin.register(TournamentMatch)
class TournamentMatchAdmin(admin.ModelAdmin):
    list_display = ("__str__", "tournament", "stage", "visible_on_tournament_page")


@admin.register(Sponsor)
class SponsorAdmin(admin.ModelAdmin):
    list_display = ("name", "order", "is_active", "website_url")
    list_filter = ("is_active",)
    list_editable = ("order", "is_active")
    search_fields = ("name",)


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
	list_display = ("home_team_name", "home_score", "away_score", "away_team_name", "season", "date", "team")
	list_filter = ("team", "season")
	search_fields = ("home_team_name", "away_team_name", "season")
	fields = ("team", "season", "date", "home_team_name", "home_score", "away_score", "away_team_name", "youtube_link")


# --- NewsArticle Admin ---
@admin.register(NewsArticle)
class NewsArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "is_published", "published_at")
    list_filter = ("is_published",)
    list_editable = ("is_published",)
    search_fields = ("title", "body")
    readonly_fields = ("published_at", "updated_at", "slug")


# --- AITrainingPlan Admin ---
@admin.register(AITrainingPlan)
class AITrainingPlanAdmin(admin.ModelAdmin):
    list_display = ("__str__", "team", "age_label", "expected_players", "created_by", "created_at")
    list_filter = ("team", "discipline")
    search_fields = ("age_label", "coach_notes", "generated_plan")
    readonly_fields = ("created_at", "created_by", "generated_plan", "followup_notes")


# --- UserRole Admin ---
from .models import UserRole

@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'discipline')
    list_filter = ('role', 'discipline')
    search_fields = ('user__username', 'discipline__name')


# --- Resource Locations & Bookings Admin ---
from .models import Location, ResourceBooking

@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'name_en', 'order')
    search_fields = ('name',)
    list_editable = ('order',)

@admin.register(ResourceBooking)
class ResourceBookingAdmin(admin.ModelAdmin):
    list_display = ('location', 'discipline', 'team', 'start_datetime', 'end_datetime')
    list_filter = ('location', 'discipline')
    search_fields = ('location__name', 'team__name', 'discipline__name')
