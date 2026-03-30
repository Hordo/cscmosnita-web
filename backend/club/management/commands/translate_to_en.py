from django.core.management.base import BaseCommand
from club.models import Discipline, Team, Player
from deep_translator import GoogleTranslator

class Command(BaseCommand):
    help = "Auto-translate Romanian fields to English"

    def handle(self, *args, **kwargs):
        # Disciplines
        for d in Discipline.objects.all():
            if d.name and not d.name_en:
                d.name_en = GoogleTranslator(source='ro', target='en').translate(d.name)
            if d.description and not d.description_en:
                d.description_en = GoogleTranslator(source='ro', target='en').translate(d.description)
            d.save()
            self.stdout.write(self.style.SUCCESS(f"Discipline {d.name} translated."))

        # Teams
        for t in Team.objects.all():
            if t.name and not t.name_en:
                t.name_en = GoogleTranslator(source='ro', target='en').translate(t.name)
            t.save()
            self.stdout.write(self.style.SUCCESS(f"Team {t.name} translated."))

        # Players
        for p in Player.objects.all():
            if p.position and not p.position_en:
                p.position_en = GoogleTranslator(source='ro', target='en').translate(p.position)
            p.save()
            self.stdout.write(self.style.SUCCESS(f"Player {p} translated."))

        self.stdout.write(self.style.SUCCESS("Translation complete!"))
