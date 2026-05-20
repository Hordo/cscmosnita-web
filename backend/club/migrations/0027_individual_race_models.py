from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('club', '0026_individualresult_add_player'),
    ]

    operations = [
        migrations.CreateModel(
            name='IndividualRace',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='e.g. Kata U14, Kumite -55kg, 100m Senior', max_length=200)),
                ('video_link', models.URLField(blank=True, help_text='Optional YouTube/video link for this race')),
                ('order', models.PositiveIntegerField(default=0, help_text='Display order within the competition')),
                ('competition', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='races', to='club.individualcompetition')),
            ],
            options={
                'verbose_name': 'Individual Race',
                'verbose_name_plural': 'Individual Races',
                'ordering': ['order', 'id'],
            },
        ),
        migrations.CreateModel(
            name='IndividualRaceParticipant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('athlete_name', models.CharField(max_length=150)),
                ('place', models.PositiveIntegerField(blank=True, help_text='1=1st place, 2=2nd place, 3=3rd place, null=other participant', null=True)),
                ('race', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='participants', to='club.individualrace')),
                ('player', models.ForeignKey(blank=True, help_text='Registered team player. If set, athlete_name is auto-populated.', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='race_participations', to='club.player')),
            ],
            options={
                'verbose_name': 'Race Participant',
                'verbose_name_plural': 'Race Participants',
                'ordering': ['place', 'athlete_name'],
            },
        ),
    ]
