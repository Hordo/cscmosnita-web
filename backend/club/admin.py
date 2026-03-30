from django.contrib import admin
from .models import Discipline

@admin.register(Discipline)
class DisciplineAdmin(admin.ModelAdmin):
	list_display = ("name", "name_en", "head_coach")
	search_fields = ("name", "name_en")
	list_filter = ("head_coach",)
	fields = ("name", "name_en", "description", "description_en", "head_coach")
