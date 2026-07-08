from django.db import migrations, models


PLATFORM_DATA = [
    ('telegram', 'Telegram'),
    ('vk', 'VK'),
    ('max', 'MAX'),
    ('dzen', 'Дзен'),
    ('youtube', 'YouTube'),
    ('rutube', 'RuTube'),
    ('instagram', 'Instagram'),
    ('site', 'Сайт'),
    ('other', 'Другое'),
]


def create_platforms(apps, schema_editor):
    Platform = apps.get_model('media_plan', 'Platform')
    for slug, name in PLATFORM_DATA:
        Platform.objects.get_or_create(slug=slug, defaults={'name': name})


def migrate_platforms(apps, schema_editor):
    Publication = apps.get_model('media_plan', 'Publication')
    Platform = apps.get_model('media_plan', 'Platform')
    for pub in Publication.objects.iterator():
        if pub.platform:
            try:
                platform = Platform.objects.get(slug=pub.platform)
                pub.platforms.add(platform)
            except Platform.DoesNotExist:
                pass


class Migration(migrations.Migration):
    dependencies = [
        ('media_plan', '0003_publication_priority_project'),
    ]

    operations = [
        migrations.CreateModel(
            name='Platform',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slug', models.SlugField(unique=True, verbose_name='Код')),
                ('name', models.CharField(max_length=50, verbose_name='Название')),
            ],
            options={
                'verbose_name': 'Платформа',
                'verbose_name_plural': 'Платформы',
                'ordering': ['name'],
            },
        ),
        migrations.RunPython(create_platforms),
        migrations.AddField(
            model_name='publication',
            name='platforms',
            field=models.ManyToManyField(
                blank=True,
                related_name='publications',
                to='media_plan.platform',
                verbose_name='Платформы',
            ),
        ),
        migrations.RunPython(migrate_platforms),
        migrations.RemoveField(
            model_name='publication',
            name='platform',
        ),
    ]
