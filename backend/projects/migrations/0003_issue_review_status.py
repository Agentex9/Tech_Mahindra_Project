from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0002_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='issues',
            name='status',
            field=models.CharField(
                choices=[
                    ('Not Started', 'Not Started'),
                    ('In Progress', 'In Progress'),
                    ('Review', 'Review'),
                    ('Completed', 'Completed'),
                    ('On Hold', 'On Hold'),
                    ('Cancelled', 'Cancelled'),
                ],
                default='Not Started',
                max_length=255,
            ),
        ),
    ]
