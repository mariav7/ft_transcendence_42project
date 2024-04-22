# Generated by Django 5.0.2 on 2024-02-19 14:48

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='friendship',
            name='from_user',
        ),
        migrations.RemoveField(
            model_name='friendship',
            name='to_user',
        ),
        migrations.AddField(
            model_name='friendship',
            name='recipient',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='recipient', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='friendship',
            name='sender',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='sender', to=settings.AUTH_USER_MODEL),
        ),
    ]
