from django.contrib import admin
from .models import (
    Region, Category, Place, PlaceImage, Activity, Favorite,
    Review, ReviewImage, TravelList, TravelListPlace, PlaceSuggestion, Notification,
)


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "created_at"]
    search_fields = ["name", "description"]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "created_at"]
    search_fields = ["name"]


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ["id", "name"]
    search_fields = ["name", "description"]


class PlaceImageInline(admin.TabularInline):
    model = PlaceImage
    extra = 1


@admin.register(Place)
class PlaceAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "region", "category", "best_season", "entrance_fee", "is_active", "created_at"]
    list_filter = ["is_active", "region", "category", "best_season"]
    list_editable = ["is_active"]
    search_fields = ["name", "description", "address"]
    filter_horizontal = ["activities"]
    autocomplete_fields = ["region", "category", "created_by"]
    readonly_fields = ["created_at", "updated_at"]
    inlines = [PlaceImageInline]


@admin.register(PlaceImage)
class PlaceImageAdmin(admin.ModelAdmin):
    list_display = ["id", "place", "is_main", "created_at"]
    list_filter = ["is_main"]
    search_fields = ["place__name"]


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "place", "created_at"]
    search_fields = ["user__username", "place__name"]


class ReviewImageInline(admin.TabularInline):
    model = ReviewImage
    extra = 0


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    inlines = [ReviewImageInline]
    list_display = ["id", "user", "place", "rating", "created_at"]
    list_filter = ["rating"]
    search_fields = ["user__username", "place__name", "comment"]


class TravelListPlaceInline(admin.TabularInline):
    model = TravelListPlace
    extra = 0
    autocomplete_fields = ["place"]


@admin.register(TravelList)
class TravelListAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "user", "is_public", "created_at"]
    list_filter = ["is_public"]
    search_fields = ["title", "user__username"]
    inlines = [TravelListPlaceInline]


@admin.register(TravelListPlace)
class TravelListPlaceAdmin(admin.ModelAdmin):
    list_display = ["id", "travel_list", "place", "order", "is_visited"]
    list_filter = ["is_visited"]


@admin.register(PlaceSuggestion)
class PlaceSuggestionAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "user", "region", "status", "created_at"]
    list_filter = ["status", "region"]
    search_fields = ["name", "user__username"]


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "kind", "text", "is_read", "created_at"]
    list_filter = ["kind", "is_read"]
    search_fields = ["user__username", "text"]
