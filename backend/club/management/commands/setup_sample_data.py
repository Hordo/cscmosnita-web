from django.core.management.base import BaseCommand
from club.models import Discipline, Coach

class Command(BaseCommand):
    help = 'Setup sample data for testing'

    def handle(self, *args, **options):
        # Create sample coaches
        coach1, created = Coach.objects.get_or_create(
            first_name="Ion",
            last_name="Popescu",
            defaults={
                'phone': "0722 123 456",
                'photo_url': "https://example.com/coach1.jpg"
            }
        )
        
        coach2, created = Coach.objects.get_or_create(
            first_name="Maria",
            last_name="Ionescu", 
            defaults={
                'phone': "0733 987 654",
                'photo_url': "https://example.com/coach2.jpg"
            }
        )
        
        coach3, created = Coach.objects.get_or_create(
            first_name="Vasile",
            last_name="Georgescu",
            defaults={
                'phone': "0744 555 333",
                'photo_url': "https://example.com/coach3.jpg"
            }
        )
        
        # Assign coaches to disciplines
        try:
            fotbal = Discipline.objects.get(name="Fotbal")
            fotbal.head_coach = coach1
            fotbal.save()
            self.stdout.write(self.style.SUCCESS('Assigned coach to Fotbal'))
        except Discipline.DoesNotExist:
            self.stdout.write(self.style.WARNING('Fotbal discipline not found'))
            
        try:
            baschet = Discipline.objects.get(name="Baschet")
            baschet.head_coach = coach2
            baschet.save()
            self.stdout.write(self.style.SUCCESS('Assigned coach to Baschet'))
        except Discipline.DoesNotExist:
            self.stdout.write(self.style.WARNING('Baschet discipline not found'))
            
        try:
            handbal = Discipline.objects.get(name="Handbal")
            handbal.head_coach = coach3
            handbal.save()
            self.stdout.write(self.style.SUCCESS('Assigned coach to Handbal'))
        except Discipline.DoesNotExist:
            self.stdout.write(self.style.WARNING('Handbal discipline not found'))
        
        self.stdout.write(self.style.SUCCESS('Sample data setup complete!'))
