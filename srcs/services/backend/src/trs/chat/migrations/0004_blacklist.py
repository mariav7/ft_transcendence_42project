# Generated by Django 5.0.2 on 2024-03-11 14:23

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0003_delete_blacklist'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='BlackList',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('blocked_user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='blocked_user', to=settings.AUTH_USER_MODEL)),
                ('blocking_user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='blocking_user', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
