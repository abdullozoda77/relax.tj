"""Smaller copies of photos, so cards and galleries (especially on phones) do not download the full-size originals.

A copy is made the first time it is asked for and saved as WebP in media/thumbs/<size>/…; later requests reuse it.
If a copy can not be made (a broken file), the original is used.
"""
import os
from pathlib import Path

from django.conf import settings
from PIL import Image, ImageOps

SIZES = {"small": 640, "medium": 1200}  # the longest side in pixels: cards / big gallery photo


def _absolute(url, request):
    return request.build_absolute_uri(url) if request else url


def thumbnail_url(image_field, request=None, size="small"):
    if not image_field:
        return None
    rel = Path("thumbs") / size / Path(image_field.name).with_suffix(".webp")
    dest = Path(settings.MEDIA_ROOT) / rel
    if not dest.exists():
        try:
            dest.parent.mkdir(parents=True, exist_ok=True)
            with Image.open(image_field.path) as original:
                image = ImageOps.exif_transpose(original).convert("RGB")
                image.thumbnail((SIZES[size], SIZES[size]), Image.LANCZOS)
                # Written under a temporary name first, so a half-written copy is never served.
                tmp = dest.with_name(f"{dest.stem}.{os.getpid()}.tmp")
                image.save(tmp, "WEBP", quality=78, method=4)
                tmp.replace(dest)
        except (OSError, ValueError):
            return _absolute(image_field.url, request)
    return _absolute(settings.MEDIA_URL + rel.as_posix(), request)
