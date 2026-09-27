from django.contrib.auth import get_user_model
from django.db.models import Q
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Favorite, Notification, PlaceSuggestion, Review


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

@receiver(post_save, sender=PlaceSuggestion)
def notify_about_new_suggestion(sender, instance, created, **kwargs):
    """Tell admins and moderators that a new place suggestion is waiting for review (except its author)."""
    if not created:
        return
    reviewers = (
        get_user_model().objects.filter(Q(role__in=["admin", "moderator"]) | Q(is_staff=True), is_active=True)
        .exclude(pk=instance.user_id)
        .values_list("id", flat=True)
    )
    Notification.objects.bulk_create([
        Notification(
            user_id=user_id,
            kind="suggestion",
            text=f"Новое предложение места «{instance.name}» от @{instance.user.username} — ждёт проверки",
            link="/admin-panel?tab=suggestions",
        )
        for user_id in reviewers
    ])
