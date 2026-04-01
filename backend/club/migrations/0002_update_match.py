import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Idempotent migration that brings club_match to the new schema regardless
    of how much was already applied on the remote database.

    Uses RunSQL with IF EXISTS / IF NOT EXISTS guards so every statement is
    safe to re-run, then SeparateDatabaseAndState to keep Django's ORM state
    in sync without executing redundant DDL.

    If you need to re-run this migration after it was already marked applied:
        python manage.py migrate club 0001 --fake
        python manage.py migrate
    """

    dependencies = [
        ('club', '0001_initial'),
    ]

    operations = [
        # ------------------------------------------------------------------ #
        # 1. Idempotent DDL — safe regardless of current DB state             #
        # ------------------------------------------------------------------ #
        migrations.RunSQL(
            sql=[
                # Drop old columns (IF EXISTS = no-op when already gone)
                "ALTER TABLE club_match DROP COLUMN IF EXISTS championship_id;",
                "ALTER TABLE club_match DROP COLUMN IF EXISTS home;",
                "ALTER TABLE club_match DROP COLUMN IF EXISTS opponent_name;",
                "ALTER TABLE club_match DROP COLUMN IF EXISTS our_score;",
                "ALTER TABLE club_match DROP COLUMN IF EXISTS opponent_score;",

                # Add new columns (IF NOT EXISTS = no-op when already present)
                "ALTER TABLE club_match ADD COLUMN IF NOT EXISTS home_team_name VARCHAR(150) NOT NULL DEFAULT '';",
                "ALTER TABLE club_match ADD COLUMN IF NOT EXISTS away_team_name VARCHAR(150) NOT NULL DEFAULT '';",
                "ALTER TABLE club_match ADD COLUMN IF NOT EXISTS home_score INTEGER NULL;",
                "ALTER TABLE club_match ADD COLUMN IF NOT EXISTS away_score INTEGER NULL;",

                # Make date nullable (DROP NOT NULL on an already-nullable
                # column is a no-op in PostgreSQL)
                "ALTER TABLE club_match ALTER COLUMN date DROP NOT NULL;",

                # Make team_id nullable (was NOT NULL CASCADE in 0001)
                "ALTER TABLE club_match ALTER COLUMN team_id DROP NOT NULL;",
            ],
            reverse_sql=migrations.RunSQL.noop,
        ),

        # ------------------------------------------------------------------ #
        # 2. Sync Django ORM state — no DB operations, state only             #
        # ------------------------------------------------------------------ #
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.RemoveField(model_name='match', name='championship'),
                migrations.RemoveField(model_name='match', name='home'),
                migrations.RemoveField(model_name='match', name='opponent_name'),
                migrations.RemoveField(model_name='match', name='our_score'),
                migrations.RemoveField(model_name='match', name='opponent_score'),
                migrations.AddField(
                    model_name='match',
                    name='home_team_name',
                    field=models.CharField(max_length=150, default=''),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name='match',
                    name='away_team_name',
                    field=models.CharField(max_length=150, default=''),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name='match',
                    name='home_score',
                    field=models.IntegerField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='match',
                    name='away_score',
                    field=models.IntegerField(blank=True, null=True),
                ),
                migrations.AlterField(
                    model_name='match',
                    name='date',
                    field=models.DateField(blank=True, null=True),
                ),
                migrations.AlterField(
                    model_name='match',
                    name='team',
                    field=models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='matches',
                        to='club.team',
                    ),
                ),
            ],
        ),
    ]
