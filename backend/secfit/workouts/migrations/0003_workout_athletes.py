# Generated by Django 3.1 on 2021-03-15 15:27

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workouts', '0002_remove_workout_athletes'),
    ]

    operations = [
        migrations.AddField(
            model_name='workout',
            name='athletes',
            field=models.CharField(default='', max_length=500),
        ),
    ]