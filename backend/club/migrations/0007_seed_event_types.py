from django.db import migrations


EVENT_TYPES = [
    {"name": "training",  "name_en": "Training",  "color": "#28a745", "icon": "fa-running"},
    {"name": "match",     "name_en": "Match",     "color": "#dc3545", "icon": "fa-futbol"},
    {"name": "meeting",   "name_en": "Meeting",   "color": "#007bff", "icon": "fa-users"},
    {"name": "other",     "name_en": "Other",     "color": "#6c757d", "icon": "fa-calendar"},
]


def seed_event_types(apps, schema_editor):
    EventType = apps.get_model("club", "EventType")
    for et in EVENT_TYPES:
        EventType.objects.get_or_create(name=et["name"], defaults=et)


def unseed_event_types(apps, schema_editor):
    EventType = apps.get_model("club", "EventType")
    names = [et["name"] for et in EVENT_TYPES]
    EventType.objects.filter(name__in=names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("club", "0006_calendarevent_is_recurring_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_event_types, reverse_code=unseed_event_types),
    ]
