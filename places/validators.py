from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator

MAX_IMAGE_SIZE_MB = 5

validate_image_extension = FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "webp"])


def validate_image_size(file):
    if file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024:
        raise ValidationError(f"Размер изображения не должен превышать {MAX_IMAGE_SIZE_MB} МБ.")


image_validators = [validate_image_extension, validate_image_size]
