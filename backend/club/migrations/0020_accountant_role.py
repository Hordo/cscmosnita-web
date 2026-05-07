from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('club', '0019_teamphoto'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userrole',
            name='discipline',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='user_roles',
                to='club.discipline',
            ),
        ),
    ]
