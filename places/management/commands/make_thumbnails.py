from django.core.management.base import BaseCommand

from places.models import PlaceImage, ReviewImage
from places.thumbnails import SIZES, thumbnail_url


class Command(BaseCommand):
    help = "Makes the small copies of all place and review photos ahead of time (they are also made on first use)."

    def handle(self, *args, **options):
        count = 0
        for image in PlaceImage.objects.all():
            for size in SIZES:
                thumbnail_url(image.image, size=size)
            count += 1
        for image in ReviewImage.objects.all():
            thumbnail_url(image.image, size="small")
            count += 1
        self.stdout.write(self.style.SUCCESS(f"Photos with small copies: {count}"))
