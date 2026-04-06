# Generated migration for NewsArticle model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('club', '0011_add_sponsor'),
    ]

    operations = [
        migrations.CreateModel(
            name='NewsArticle',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=300)),
                ('title_en', models.CharField(blank=True, max_length=300, null=True)),
                ('body', models.TextField()),
                ('body_en', models.TextField(blank=True, null=True)),
                ('cover_url', models.CharField(blank=True, help_text='URL to cover image', max_length=500, null=True)),
                ('published_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_published', models.BooleanField(default=True)),
                ('slug', models.SlugField(blank=True, max_length=350, unique=True)),
            ],
            options={
                'verbose_name': 'News Article',
                'verbose_name_plural': 'News Articles',
                'ordering': ['-published_at'],
            },
        ),
    ]
