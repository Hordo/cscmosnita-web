from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('club', '0023_add_recurrence_and_external_to_resourcebooking'),
    ]

    operations = [
        migrations.AlterField(
            model_name='resourcebooking',
            name='recurrence_type',
            field=models.CharField(
                blank=True,
                choices=[
                    ('daily', 'Daily'),
                    ('weekly', 'Weekly'),
                    ('biweekly', 'Biweekly'),
                    ('monthly', 'Monthly'),
                    ('weekdays', 'Weekdays (Mon-Fri)'),
                ],
                max_length=16,
                null=True,
            ),
        ),
    ]
