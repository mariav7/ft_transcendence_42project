# Generated by Django 5.0.2 on 2024-03-12 12:50

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pong', '0005_participant'),
    ]

    operations = [
        migrations.AddField(
            model_name='tournament',
            name='status',
            field=models.CharField(default='pending', max_length=20),
        ),
    ]