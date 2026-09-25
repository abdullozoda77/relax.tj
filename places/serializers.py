from django.db.models import Avg
from rest_framework import serializers
from accounts.serializers import UserShortSerializer
from .models import (
    Region, Category, Activity, Place, PlaceImage, Favorite,
    Review, TravelList, TravelListPlace, PlaceSuggestion,
)

class RegionSerializer(serializers.ModelSerializer):
    places_count = serializers.SerializerMethodField()
    class Meta:
        model = Region
        fields = ["id", "name", "description", "image", "places_count", "created_at"]

    def get_places_count(self, obj):
        return obj.places.filter(is_active=True).count()

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "icon", "created_at"]

class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = ["id", "name", "description", "icon"]

class PlaceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlaceImage
        fields = ["id", "place", "image", "is_main", "created_at"]

    def validate(self, attrs):
        place = attrs.get("place", getattr(self.instance, "place", None))
        is_main = attrs.get("is_main", getattr(self.instance, "is_main", False))
        if is_main:
            others = PlaceImage.objects.filter(place=place, is_main=True)
            if self.instance:
                others = others.exclude(pk=self.instance.pk)
            if others.exists():
                raise serializers.ValidationError({"is_main": "This place already has a main image."})
        return attrs

class PlaceRatingMixin(serializers.Serializer):
    average_rating = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()

    def get_average_rating(self, obj):
        if hasattr(obj, "avg_rating"):
            avg = obj.avg_rating
        else:
            avg = obj.reviews.aggregate(avg=Avg("rating"))["avg"]
        return round(avg, 1) if avg else None

    def get_reviews_count(self, obj):
        if hasattr(obj, "reviews_total"):
            return obj.reviews_total
        return obj.reviews.count()

    def get_is_favorite(self, obj):
        if hasattr(obj, "is_favorite_for_user"):
            return obj.is_favorite_for_user
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.favorited_by.filter(user=request.user).exists()

class PlaceListSerializer(PlaceRatingMixin, serializers.ModelSerializer):
    region = serializers.CharField(source="region.name", read_only=True)
    category = serializers.CharField(source="category.name", read_only=True, default=None)
    main_image = serializers.SerializerMethodField()

    class Meta:
        model = Place
        fields = [
            "id", "name", "region", "category", "main_image", "best_season",
            "entrance_fee", "views_count", "average_rating", "reviews_count", "is_favorite",
        ]

    def get_main_image(self, obj):
        images = list(obj.images.all())  # uses prefetch; ordering puts the main image first
        image = images[0] if images else None
        if not image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(image.image.url) if request else image.image.url

class PlaceDetailSerializer(PlaceRatingMixin, serializers.ModelSerializer):
    region = RegionSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    activities = ActivitySerializer(many=True, read_only=True)
    images = PlaceImageSerializer(many=True, read_only=True)
    created_by = UserShortSerializer(read_only=True)

    class Meta:
        model = Place
        fields = [
            "id", "name", "description", "region", "category", "activities", "images",
            "address", "how_to_get_there", "latitude", "longitude", "altitude",
            "best_season", "entrance_fee", "views_count", "average_rating", "reviews_count",
            "is_favorite", "is_active", "created_by", "created_at", "updated_at",
        ]

class PlaceWriteSerializer(serializers.ModelSerializer):
    activities = serializers.PrimaryKeyRelatedField(queryset=Activity.objects.all(), many=True, required=False)

    class Meta:
        model = Place
        fields = [
            "id", "name", "description", "region", "category", "activities",
            "address", "how_to_get_there", "latitude", "longitude", "altitude",
            "best_season", "entrance_fee", "is_active",
        ]

    def validate_latitude(self, value):
        if value is not None and not -90 <= value <= 90:
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_longitude(self, value):
        if value is not None and not -180 <= value <= 180:
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value

    def validate_entrance_fee(self, value):
        if value < 0:
            raise serializers.ValidationError("Entrance fee cannot be negative.")
        return value

class ReviewSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    author = UserShortSerializer(source="user", read_only=True)
    place_name = serializers.CharField(source="place.name", read_only=True)

    class Meta:
        model = Review
        fields = ["id", "user", "author", "place", "place_name", "rating", "comment", "created_at", "updated_at"]

    def validate_place(self, value):
        if self.instance and self.instance.place != value:
            raise serializers.ValidationError("You cannot move a review to another place.")
        return value

class FavoriteSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    place_detail = PlaceListSerializer(source="place", read_only=True)

    class Meta:
        model = Favorite
        fields = ["id", "user", "place", "place_detail", "created_at"]

class TravelListPlaceSerializer(serializers.ModelSerializer):
    place_detail = PlaceListSerializer(source="place", read_only=True)

    class Meta:
        model = TravelListPlace
        fields = ["id", "travel_list", "place", "place_detail", "order", "note", "is_visited", "added_at"]

    def validate_travel_list(self, value):
        if value.user != self.context["request"].user:
            raise serializers.ValidationError("This is not your travel list.")
        return value

class TravelListSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)
    items = TravelListPlaceSerializer(many=True, read_only=True)
    places_count = serializers.SerializerMethodField()
    class Meta:
        model = TravelList
        fields = ["id", "user", "title", "description", "is_public", "places_count", "items", "created_at", "updated_at"]

    def get_places_count(self, obj):
        return obj.items.count()

class PlaceSuggestionSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)
    class Meta:
        model = PlaceSuggestion
        fields = [
            "id", "user", "name", "description", "region", "category",
            "address", "image", "status", "admin_comment", "created_at",
        ]
        read_only_fields = ["status", "admin_comment"]

class PlaceSuggestionReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlaceSuggestion
        fields = ["id", "status", "admin_comment"]

    def validate_status(self, value):
        if value == "pending":
            raise serializers.ValidationError("Choose approved or rejected.")
        return value

class SuggestionApproveSerializer(serializers.Serializer):
    region = serializers.PrimaryKeyRelatedField(queryset=Region.objects.all(), required=False)
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), required=False, allow_null=True)
    admin_comment = serializers.CharField(required=False, allow_blank=True)

class RejectSerializer(serializers.Serializer):
    admin_comment = serializers.CharField()

class TravelListAddPlaceSerializer(serializers.Serializer):
    place = serializers.PrimaryKeyRelatedField(queryset=Place.objects.filter(is_active=True))
    note = serializers.CharField(required=False, allow_blank=True, default="")
    order = serializers.IntegerField(required=False, min_value=0)
