import os
from io import BytesIO
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from PIL import Image, ImageDraw
from apps.chat.models import Sticker


STICKERS = [
    ('fire', '#ef4444'),
    ('cool', '#3b82f6'),
    ('wow', '#f59e0b'),
    ('love', '#ec4899'),
    ('ok', '#10b981'),
    ('sad', '#64748b'),
]


class Command(BaseCommand):
    help = 'Create default sticker images'

    def handle(self, *args, **options):
        size = 128
        for name, color in STICKERS:
            img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            draw.ellipse([4, 4, size - 4, size - 4], fill=color)
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            sticker, created = Sticker.objects.get_or_create(name=name)
            if created or not sticker.image:
                sticker.image.save(f'{name}.png', ContentFile(buffer.read()), save=True)
                self.stdout.write(self.style.SUCCESS(f'Sticker {name} created'))
            else:
                self.stdout.write(f'Sticker {name} already exists')
