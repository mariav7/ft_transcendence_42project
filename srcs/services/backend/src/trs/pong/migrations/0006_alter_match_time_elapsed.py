# Generated by Django 5.0.2 on 2024-03-10 11:25

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pong', '0005_alter_match_time_elapsed'),
    ]

    operations = [
        migrations.AlterField(
            model_name='match',
            name='time_elapsed',
            field=models.IntegerField(default=0),
        ),
    ]