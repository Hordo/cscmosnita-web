"""
Force-sync the Aiven database to the current Django model state.

This migration is fully idempotent — safe to run regardless of whether former
migrations succeeded, partially ran, or were never applied.  Every SQL
statement uses IF (NOT) EXISTS guards so it never errors on an already-correct
database.

Deploy steps on Koyeb:
    python manage.py migrate          # if 0001+0002 are already recorded
    # -- OR, if the migrations table is empty --
    python manage.py migrate --fake-initial
    python manage.py migrate
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('club', '0002_update_match'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[

                # ==============================================================
                # TABLES — Create if missing (new databases / full reset)
                # ==============================================================

                # club_eventtype
                """
                CREATE TABLE IF NOT EXISTS club_eventtype (
                    id          BIGSERIAL PRIMARY KEY,
                    name        VARCHAR(50)  NOT NULL UNIQUE,
                    name_en     VARCHAR(50),
                    color       VARCHAR(7)   NOT NULL DEFAULT '#007bff',
                    icon        VARCHAR(50),
                    description TEXT,
                    description_en TEXT
                );
                """,

                # club_coach  (no FKs yet — discipline references it)
                """
                CREATE TABLE IF NOT EXISTS club_coach (
                    id                   BIGSERIAL PRIMARY KEY,
                    first_name           VARCHAR(100) NOT NULL,
                    last_name            VARCHAR(100) NOT NULL,
                    phone                VARCHAR(30),
                    photo_url            VARCHAR(500),
                    is_head_of_discipline BOOLEAN NOT NULL DEFAULT FALSE
                );
                """,

                # club_discipline
                """
                CREATE TABLE IF NOT EXISTS club_discipline (
                    id              BIGSERIAL PRIMARY KEY,
                    name            VARCHAR(100) NOT NULL UNIQUE,
                    name_en         VARCHAR(100),
                    description     TEXT,
                    description_en  TEXT,
                    head_coach_id   BIGINT REFERENCES club_coach(id) ON DELETE SET NULL
                );
                """,

                # club_team
                """
                CREATE TABLE IF NOT EXISTS club_team (
                    id            BIGSERIAL PRIMARY KEY,
                    name          VARCHAR(100) NOT NULL,
                    name_en       VARCHAR(100),
                    year          INTEGER,
                    photo_url     VARCHAR(500),
                    discipline_id BIGINT REFERENCES club_discipline(id) ON DELETE SET NULL
                );
                """,

                # club_coach_teams  (M2M)
                """
                CREATE TABLE IF NOT EXISTS club_coach_teams (
                    id       BIGSERIAL PRIMARY KEY,
                    coach_id BIGINT NOT NULL REFERENCES club_coach(id) ON DELETE CASCADE,
                    team_id  BIGINT NOT NULL REFERENCES club_team(id)  ON DELETE CASCADE
                );
                """,

                # club_player
                """
                CREATE TABLE IF NOT EXISTS club_player (
                    id          BIGSERIAL PRIMARY KEY,
                    first_name  VARCHAR(100) NOT NULL,
                    last_name   VARCHAR(100) NOT NULL,
                    number      INTEGER,
                    position    VARCHAR(50)  NOT NULL DEFAULT '',
                    position_en VARCHAR(50),
                    photo_url   VARCHAR(500),
                    team_id     BIGINT NOT NULL REFERENCES club_team(id) ON DELETE CASCADE
                );
                """,

                # club_championship
                """
                CREATE TABLE IF NOT EXISTS club_championship (
                    id      BIGSERIAL PRIMARY KEY,
                    name    VARCHAR(150) NOT NULL,
                    season  VARCHAR(20)  NOT NULL DEFAULT '',
                    team_id BIGINT NOT NULL REFERENCES club_team(id) ON DELETE CASCADE
                );
                """,

                # club_match  — created with NEW schema
                """
                CREATE TABLE IF NOT EXISTS club_match (
                    id             BIGSERIAL PRIMARY KEY,
                    date           DATE,
                    home_team_name VARCHAR(150) NOT NULL DEFAULT '',
                    away_team_name VARCHAR(150) NOT NULL DEFAULT '',
                    home_score     INTEGER,
                    away_score     INTEGER,
                    youtube_link   VARCHAR(200) NOT NULL DEFAULT '',
                    team_id        BIGINT REFERENCES club_team(id) ON DELETE SET NULL
                );
                """,

                # club_calendarevent
                """
                CREATE TABLE IF NOT EXISTS club_calendarevent (
                    id                  BIGSERIAL PRIMARY KEY,
                    title               VARCHAR(200) NOT NULL,
                    description         TEXT,
                    start_datetime      TIMESTAMPTZ NOT NULL,
                    end_datetime        TIMESTAMPTZ NOT NULL,
                    all_day             BOOLEAN NOT NULL DEFAULT FALSE,
                    location            VARCHAR(200),
                    is_cancelled        BOOLEAN NOT NULL DEFAULT FALSE,
                    cancellation_reason TEXT,
                    created_at          TIMESTAMPTZ NOT NULL,
                    updated_at          TIMESTAMPTZ NOT NULL,
                    created_by_id       INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
                    discipline_id       BIGINT  REFERENCES club_discipline(id)  ON DELETE SET NULL,
                    event_type_id       BIGINT  REFERENCES club_eventtype(id)   ON DELETE SET NULL,
                    team_id             BIGINT  REFERENCES club_team(id)        ON DELETE SET NULL
                );
                """,

                # club_calendarevent_players  (M2M)
                """
                CREATE TABLE IF NOT EXISTS club_calendarevent_players (
                    id               BIGSERIAL PRIMARY KEY,
                    calendarevent_id BIGINT NOT NULL REFERENCES club_calendarevent(id) ON DELETE CASCADE,
                    player_id        BIGINT NOT NULL REFERENCES club_player(id)        ON DELETE CASCADE
                );
                """,

                # club_trainingsession
                """
                CREATE TABLE IF NOT EXISTS club_trainingsession (
                    id               BIGSERIAL PRIMARY KEY,
                    training_type    VARCHAR(50) NOT NULL DEFAULT 'regular',
                    objectives       TEXT        NOT NULL DEFAULT '',
                    notes            TEXT,
                    calendar_event_id BIGINT NOT NULL UNIQUE
                        REFERENCES club_calendarevent(id) ON DELETE CASCADE
                );
                """,

                # club_eventattendance
                """
                CREATE TABLE IF NOT EXISTS club_eventattendance (
                    id                BIGSERIAL PRIMARY KEY,
                    status            VARCHAR(10) NOT NULL DEFAULT 'present',
                    notes             TEXT,
                    recorded_at       TIMESTAMPTZ NOT NULL,
                    calendar_event_id BIGINT NOT NULL REFERENCES club_calendarevent(id) ON DELETE CASCADE,
                    player_id         BIGINT NOT NULL REFERENCES club_player(id)        ON DELETE CASCADE,
                    recorded_by_id    INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
                    UNIQUE (calendar_event_id, player_id)
                );
                """,

                # ==============================================================
                # club_match — repair OLD schema if table already existed
                # ==============================================================

                # Drop columns that belong to the old design
                "ALTER TABLE club_match DROP COLUMN IF EXISTS championship_id;",
                "ALTER TABLE club_match DROP COLUMN IF EXISTS home;",
                "ALTER TABLE club_match DROP COLUMN IF EXISTS opponent_name;",
                "ALTER TABLE club_match DROP COLUMN IF EXISTS our_score;",
                "ALTER TABLE club_match DROP COLUMN IF EXISTS opponent_score;",

                # Add columns from the new design (no-op when already present)
                "ALTER TABLE club_match ADD COLUMN IF NOT EXISTS home_team_name VARCHAR(150) NOT NULL DEFAULT '';",
                "ALTER TABLE club_match ADD COLUMN IF NOT EXISTS away_team_name VARCHAR(150) NOT NULL DEFAULT '';",
                "ALTER TABLE club_match ADD COLUMN IF NOT EXISTS home_score   INTEGER;",
                "ALTER TABLE club_match ADD COLUMN IF NOT EXISTS away_score   INTEGER;",
                "ALTER TABLE club_match ADD COLUMN IF NOT EXISTS youtube_link VARCHAR(200) NOT NULL DEFAULT '';",

                # Make date and team_id nullable (no-op if already nullable)
                "ALTER TABLE club_match ALTER COLUMN date    DROP NOT NULL;",
                "ALTER TABLE club_match ALTER COLUMN team_id DROP NOT NULL;",

                # ==============================================================
                # Other tables — add any columns that may be missing
                # ==============================================================

                # club_discipline
                "ALTER TABLE club_discipline ADD COLUMN IF NOT EXISTS name_en        VARCHAR(100);",
                "ALTER TABLE club_discipline ADD COLUMN IF NOT EXISTS description    TEXT;",
                "ALTER TABLE club_discipline ADD COLUMN IF NOT EXISTS description_en TEXT;",
                "ALTER TABLE club_discipline ADD COLUMN IF NOT EXISTS head_coach_id  BIGINT REFERENCES club_coach(id) ON DELETE SET NULL;",

                # club_team
                "ALTER TABLE club_team ADD COLUMN IF NOT EXISTS name_en       VARCHAR(100);",
                "ALTER TABLE club_team ADD COLUMN IF NOT EXISTS year          INTEGER;",
                "ALTER TABLE club_team ADD COLUMN IF NOT EXISTS photo_url     VARCHAR(500);",
                "ALTER TABLE club_team ADD COLUMN IF NOT EXISTS discipline_id BIGINT REFERENCES club_discipline(id) ON DELETE SET NULL;",

                # club_coach
                "ALTER TABLE club_coach ADD COLUMN IF NOT EXISTS phone                 VARCHAR(30);",
                "ALTER TABLE club_coach ADD COLUMN IF NOT EXISTS photo_url             VARCHAR(500);",
                "ALTER TABLE club_coach ADD COLUMN IF NOT EXISTS is_head_of_discipline BOOLEAN NOT NULL DEFAULT FALSE;",

                # club_player
                "ALTER TABLE club_player ADD COLUMN IF NOT EXISTS number      INTEGER;",
                "ALTER TABLE club_player ADD COLUMN IF NOT EXISTS position_en VARCHAR(50);",
                "ALTER TABLE club_player ADD COLUMN IF NOT EXISTS photo_url   VARCHAR(500);",

                # club_eventtype
                "ALTER TABLE club_eventtype ADD COLUMN IF NOT EXISTS name_en        VARCHAR(50);",
                "ALTER TABLE club_eventtype ADD COLUMN IF NOT EXISTS color          VARCHAR(7)  NOT NULL DEFAULT '#007bff';",
                "ALTER TABLE club_eventtype ADD COLUMN IF NOT EXISTS icon           VARCHAR(50);",
                "ALTER TABLE club_eventtype ADD COLUMN IF NOT EXISTS description    TEXT;",
                "ALTER TABLE club_eventtype ADD COLUMN IF NOT EXISTS description_en TEXT;",

                # club_calendarevent
                "ALTER TABLE club_calendarevent ADD COLUMN IF NOT EXISTS location            VARCHAR(200);",
                "ALTER TABLE club_calendarevent ADD COLUMN IF NOT EXISTS is_cancelled        BOOLEAN NOT NULL DEFAULT FALSE;",
                "ALTER TABLE club_calendarevent ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;",
                "ALTER TABLE club_calendarevent ADD COLUMN IF NOT EXISTS discipline_id       BIGINT REFERENCES club_discipline(id) ON DELETE SET NULL;",
                "ALTER TABLE club_calendarevent ADD COLUMN IF NOT EXISTS event_type_id       BIGINT REFERENCES club_eventtype(id)  ON DELETE SET NULL;",
            ],
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
