# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_user_position_and_staff_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='max_id',
            field=models.CharField(blank=True, max_length=100, verbose_name='MAX ID'),
        ),
    ]
