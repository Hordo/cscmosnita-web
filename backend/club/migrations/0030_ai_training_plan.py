from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('club', '0029_add_race_units'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AITrainingPlan',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('age_label', models.CharField(blank=True, help_text='Free-text age group label (e.g. "U10 – born 2015", "U12").', max_length=100)),
                ('focus_areas', models.JSONField(default=list)),
                ('expected_players', models.PositiveIntegerField(default=15)),
                ('player_range_min', models.PositiveIntegerField(default=12)),
                ('player_range_max', models.PositiveIntegerField(default=18)),
                ('coach_notes', models.TextField(blank=True, help_text='Optional coach notes / context sent to the AI.')),
                ('generated_plan', models.TextField()),
                ('followup_notes', models.TextField(blank=True, help_text='Auto-extracted follow-up hints for the next session.')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ai_training_plans', to=settings.AUTH_USER_MODEL)),
                ('discipline', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ai_training_plans', to='club.discipline')),
                ('team', models.ForeignKey(blank=True, help_text='Team this plan was generated for (optional).', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ai_training_plans', to='club.team')),
            ],
            options={
                'verbose_name': 'AI Training Plan',
                'verbose_name_plural': 'AI Training Plans',
                'ordering': ['-created_at'],
            },
        ),
    ]
