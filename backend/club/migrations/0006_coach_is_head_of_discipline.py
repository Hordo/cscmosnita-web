from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ("club", "0005_remove_coach_photo_remove_player_photo_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="coach",
            name="is_head_of_discipline",
            field=models.BooleanField(default=False, help_text="Is this coach the head of a discipline?"),
        ),
    ]