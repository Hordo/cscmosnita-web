"""
Adds recurrence fields to club_calendarevent and preference fields to
club_pushsubscription.  All SQL uses IF NOT EXISTS / safe guards so this
migration is idempotent regardless of prior partial runs.
PostgreSQL-only — silently skips on SQLite (local dev).
"""

from django.db import migrations


def run_postgres_only(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return

    statements = [
        # --- CalendarEvent: recurrence fields ---
        "ALTER TABLE club_calendarevent ADD COLUMN IF NOT EXISTS is_recurring        BOOLEAN NOT NULL DEFAULT FALSE;",
        "ALTER TABLE club_calendarevent ADD COLUMN IF NOT EXISTS recurrence_rule     VARCHAR(10);",
        "ALTER TABLE club_calendarevent ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1;",
        "ALTER TABLE club_calendarevent ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;",
        "ALTER TABLE club_calendarevent ADD COLUMN IF NOT EXISTS recurrence_group_id UUID;",
        "CREATE INDEX IF NOT EXISTS club_calendarevent_recurrence_group_id_idx ON club_calendarevent (recurrence_group_id);",

        # --- PushSubscription: preference fields ---
        "ALTER TABLE club_pushsubscription ADD COLUMN IF NOT EXISTS discipline_ids TEXT NOT NULL DEFAULT '[]';",
        "ALTER TABLE club_pushsubscription ADD COLUMN IF NOT EXISTS team_ids       TEXT NOT NULL DEFAULT '[]';",
    ]

    with schema_editor.connection.cursor() as cursor:
        for sql in statements:
            cursor.execute(sql)


class Migration(migrations.Migration):

    dependencies = [
        ('club', '0004_push_subscription'),
    ]

    operations = [
        migrations.RunPython(run_postgres_only, reverse_code=migrations.RunPython.noop),
    ]
