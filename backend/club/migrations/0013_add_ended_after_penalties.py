"""Add ended_after_penalties field to TournamentMatch"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("club", "0012_newsarticle"),
    ]

    operations = [
        migrations.AddField(
            model_name='tournamentmatch',
            name='ended_after_penalties',
            field=models.BooleanField(default=False),
        ),
    ]
