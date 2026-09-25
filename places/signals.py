from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Favorite, Notification, Review


@receiver(post_save, sender=Review)
def notify_about_new_review(sender, instance, created, **kwargs):
    """Tell everyone who has this place in favorites that a new review appeared (except the author)."""
    if not created:
        return
    fans = Favorite.objects.filter(place=instance.place).exclude(user=instance.user).values_list("user_id", flat=True)
    Notification.objects.bulk_create([
        Notification(
            user_id=user_id,
            kind="review",
            text=f"Новый отзыв ({instance.rating}★) о месте «{instance.place.name}» из вашего избранного",
            link=f"/places/{instance.place_id}",
        )
        for user_id in fans
    ])
