# Generated by Django 5.0.3 on 2024-03-21 15:02

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('pong', '0010_tournament_players'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='tournament',
            name='players',
        ),
    ]
