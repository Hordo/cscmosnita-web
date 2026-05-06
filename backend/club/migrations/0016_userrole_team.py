from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('club', '0015_userrole'),
    ]

    operations = [
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
    ]
