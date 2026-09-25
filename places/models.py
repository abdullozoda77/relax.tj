from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Region(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="regions/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Category(models.Model):
    name = models.CharField(max_length=255, unique=True)
    icon = models.ImageField(upload_to="categories/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Activity(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    icon = models.ImageField(upload_to="activities/", blank=True, null=True)

    class Meta:
        verbose_name_plural = "activities"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Place(models.Model):
    SEASONS = (
        ("spring", "Spring"),
        ("summer", "Summer"),
        ("autumn", "Autumn"),
        ("winter", "Winter"),
        ("all_year", "All year"),
    )
    region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name="places")
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name="places")
    activities = models.ManyToManyField(Activity, blank=True, related_name="places")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_places")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    how_to_get_there = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    altitude = models.PositiveIntegerField(blank=True, null=True, help_text="Meters above sea level")
    best_season = models.CharField(max_length=20, choices=SEASONS, default="summer")
    entrance_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="In somoni, 0 = free")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

class PlaceImage(models.Model):
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="places/")
    is_main = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_main", "id"]
        constraints = [
            models.UniqueConstraint(fields=["place"], condition=models.Q(is_main=True), name="one_main_image_per_place"),
        ]

    def __str__(self):
        return f"Image of {self.place}"


class Favorite(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorites")
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "place"], name="unique_favorite"),
        ]

    def __str__(self):
        return f"{self.user} likes {self.place}"

class Review(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "place"], name="unique_review"),
            models.CheckConstraint(condition=models.Q(rating__gte=1, rating__lte=5), name="rating_1_to_5"),
        ]

    def __str__(self):
        return f"{self.user} - {self.place} ({self.rating})"

class TravelList(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="travel_lists")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

class TravelListPlace(models.Model):
    travel_list = models.ForeignKey(TravelList, on_delete=models.CASCADE, related_name="items")
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name="in_travel_lists")
    order = models.PositiveIntegerField(default=0)
    note = models.TextField(blank=True)
    is_visited = models.BooleanField(default=False)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "id"]
        constraints = [
            models.UniqueConstraint(fields=["travel_list", "place"], name="unique_travel_list_place"),
        ]

    def __str__(self):
        return f"{self.place} in {self.travel_list}"

class PlaceSuggestion(models.Model):
    STATUSES = (("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected"))
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="place_suggestions")
    region = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True, blank=True, related_name="suggestions")
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="suggestions")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    image = models.ImageField(upload_to="suggestions/", blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUSES, default="pending")
    admin_comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.status})"