from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('club', '0027_individual_race_models'),
    ]

    operations = [
        migrations.CreateModel(
            name='SportRaceTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='e.g. 50m, 200m, Long Jump, Kata', max_length=200)),
                ('order', models.PositiveIntegerField(default=0, help_text='Display order')),
                ('discipline', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='race_templates', to='club.discipline')),
            ],
            options={
                'verbose_name': 'Sport Race Template',
                'verbose_name_plural': 'Sport Race Templates',
                'ordering': ['order', 'name'],
            },
        ),
        migrations.CreateModel(
            name='SportAgeCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='e.g. U9, U10, U11, Senior', max_length=100)),
                ('gender', models.CharField(
                    choices=[('boys', 'Boys'), ('girls', 'Girls'), ('mixed', 'Mixed')],
                    default='mixed',
                    max_length=10,
                )),
                ('order', models.PositiveIntegerField(default=0, help_text='Display order')),
                ('discipline', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='age_categories', to='club.discipline')),
            ],
            options={
                'verbose_name': 'Sport Age Category',
                'verbose_name_plural': 'Sport Age Categories',
                'ordering': ['order', 'name', 'gender'],
            },
        ),
    ]
