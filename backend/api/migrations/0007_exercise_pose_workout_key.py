from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_alter_exercisesession_accuracy_avg_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='exercise',
            name='pose_workout_key',
            field=models.CharField(
                blank=True,
                choices=[
                    ('stretching', '스트레칭'),
                    ('upper_body', '상체'),
                    ('knee', '무릎'),
                    ('balance', '균형'),
                ],
                max_length=20,
                null=True,
            ),
        ),
    ]
