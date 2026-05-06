# Migration that applies the real DB changes for 0016 and 0017.
# On Koyeb: fake 0016 and 0017 first, then apply this migration normally.
#   python manage.py migrate club 0017 --fake
#   python manage.py migrate club 0018

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('club', '0017_alter_userrole_id'),
    ]

    operations = [
        # From 0016: add optional team FK to UserRole
        migrations.AddField(
            model_name='userrole',
            name='team',
            field=models.ForeignKey(
                blank=True,
                help_text='Optional: restrict coach_admin to a specific team. If blank, access covers all teams in the discipline.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='user_roles',
                to='club.team',
            ),
        ),
        migrations.AlterUniqueTogether(
            name='userrole',
            unique_together={('user', 'discipline', 'team')},
        ),
        # From 0017: change id to BigAutoField
        migrations.AlterField(
            model_name='userrole',
            name='id',
            field=models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
        ),
    ]
