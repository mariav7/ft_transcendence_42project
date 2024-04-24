# Generated by Django 5.0.3 on 2024-04-11 08:44

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pong', '0013_tournament_leaderboard_tournament_winner'),
    ]

    operations = [
        migrations.AlterField(
            model_name='match',
            name='tournament',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='matches', to='pong.tournament'),
        ),
    ]
