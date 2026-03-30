from django.core.management.base import BaseCommand
from club.models import EventType


class Command(BaseCommand):
    help = 'Initialize calendar with default event types'

    def handle(self, *args, **options):
        # Default event types with colors and icons
        default_event_types = [
            {
                'name': 'Antrenament',
                'name_en': 'Training',
                'color': '#28a745',  # Green
                'icon': 'fa-running',
                'description': 'Sesiuni de antrenament regulate',
                'description_en': 'Regular training sessions'
            },
            {
                'name': 'Meci',
                'name_en': 'Match',
                'color': '#dc3545',  # Red
                'icon': 'fa-trophy',
                'description': 'Meciuri oficiale sau amicale',
                'description_en': 'Official or friendly matches'
            },
            {
                'name': 'Ședință',
                'name_en': 'Meeting',
                'color': '#007bff',  # Blue
                'icon': 'fa-users',
                'description': 'Ședințe de echipă sau staff',
                'description_en': 'Team or staff meetings'
            },
            {
                'name': 'Competiție',
                'name_en': 'Competition',
                'color': '#ffc107',  # Yellow
                'icon': 'fa-medal',
                'description': 'Participare la competiții',
                'description_en': 'Competition participation'
            },
            {
                'name': 'Eveniment Special',
                'name_en': 'Special Event',
                'color': '#6f42c1',  # Purple
                'icon': 'fa-star',
                'description': 'Evenimente speciale sau sociale',
                'description_en': 'Special or social events'
            },
            {
                'name': 'Recuperare',
                'name_en': 'Recovery',
                'color': '#fd7e14',  # Orange
                'icon': 'fa-heart',
                'description': 'Sesiuni de recuperare și wellness',
                'description_en': 'Recovery and wellness sessions'
            }
        ]

        created_count = 0
        updated_count = 0

        for event_type_data in default_event_types:
            event_type, created = EventType.objects.update_or_create(
                name=event_type_data['name'],
                defaults=event_type_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created event type: {event_type.name}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated event type: {event_type.name}')
                )

        total_count = created_count + updated_count
        self.stdout.write(
            self.style.SUCCESS(
                f'\nCalendar initialization complete!\n'
                f'Total event types processed: {total_count}\n'
                f'Created: {created_count}\n'
                f'Updated: {updated_count}'
            )
        )
