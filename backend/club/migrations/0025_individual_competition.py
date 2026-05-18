from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('club', '0024_add_weekdays_recurrence'),
    ]

    operations = [
        # Add discipline_type to Discipline
        migrations.AddField(
            model_name='discipline',
            name='discipline_type',
            field=models.CharField(
                choices=[('team', 'Team Sport'), ('individual', 'Individual Sport')],
                default='team',
                help_text='Team sport (football, basketball) or individual sport (karate, chess, athletics, kempo)',
                max_length=20,
            ),
        ),
        # Create IndividualCompetition
        migrations.CreateModel(
            name='IndividualCompetition',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('date', models.DateField(blank=True, null=True)),
                ('location', models.CharField(blank=True, max_length=200)),
                ('season', models.CharField(blank=True, max_length=20)),
                ('description', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('discipline', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='individual_competitions',
                    to='club.discipline',
                )),
                ('team', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='individual_competitions',
                    to='club.team',
                )),
            ],
            options={
                'verbose_name': 'Individual Competition',
                'verbose_name_plural': 'Individual Competitions',
                'ordering': ['-date', '-id'],
            },
        ),
        # Create IndividualResult
        migrations.CreateModel(
            name='IndividualResult',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('athlete_name', models.CharField(max_length=150)),
                ('event_category', models.CharField(
                    blank=True, max_length=150,
                    help_text='e.g. Kata U14, Kumite -55kg, 100m Senior, Rapid U12',
                )),
                ('place', models.PositiveIntegerField(
                    blank=True, null=True,
                    help_text='Final placement (1st, 2nd, 3rd…)',
                )),
                ('medal', models.CharField(
                    choices=[('gold', 'Gold'), ('silver', 'Silver'), ('bronze', 'Bronze'), ('none', 'None')],
                    default='none',
                    max_length=10,
                )),
                ('notes', models.CharField(blank=True, max_length=300)),
                ('competition', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='results',
                    to='club.individualcompetition',
                )),
            ],
            options={
                'verbose_name': 'Individual Result',
                'verbose_name_plural': 'Individual Results',
                'ordering': ['place', 'athlete_name'],
            },
        ),
    ]
