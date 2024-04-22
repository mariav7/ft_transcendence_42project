# Generated by Django 5.0.2 on 2024-03-19 13:56

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_remove_friendship_from_user_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='otp_enabled',
            field=models.BooleanField(default=False, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='otp_key',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
