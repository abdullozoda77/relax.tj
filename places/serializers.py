from django.db.models import Avg
from rest_framework import serializers
from accounts.serializers import UserShortSerializer
from .geo import in_tajikistan
from .thumbnails import thumbnail_url
from .validators import image_validators
from .models import (
    Region, Category, Activity, Place, PlaceImage, Favorite,
    Review, ReviewImage, TravelList, TravelListPlace, PlaceSuggestion, Notification,
)

LANGUAGES = ("en", "tg")  # Russian is the base language of the data


def request_language(request):
    """The site language the client asked for: ?lang=en or the Accept-Language header. Defaults to Russian."""
    if request is None:
        return "ru"
    lang = (request.query_params.get("lang") or request.headers.get("Accept-Language", ""))[:2].lower()
    return lang if lang in LANGUAGES else "ru"


def place_name(place, request):
    """The place name in the requested language, or the Russian name when there is no translation."""
    lang = request_language(request)
    return (lang != "ru" and getattr(place, f"name_{lang}", "")) or place.name


class LocalizedNameMixin(serializers.Serializer):
    name = serializers.SerializerMethodField()

    def get_name(self, obj):
        return place_name(obj, self.context.get("request"))


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
    # Lighter copies for the page; "image" stays the original (full view, admin).
    image_small = serializers.SerializerMethodField()
    image_medium = serializers.SerializerMethodField()

    class Meta:
        model = PlaceImage
        fields = ["id", "place", "image", "image_small", "image_medium", "is_main", "created_at"]

    def get_image_small(self, obj):
        return thumbnail_url(obj.image, self.context.get("request"), "small")

    def get_image_medium(self, obj):
        return thumbnail_url(obj.image, self.context.get("request"), "medium")

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

class PlaceListSerializer(LocalizedNameMixin, PlaceRatingMixin, serializers.ModelSerializer):
    region = serializers.CharField(source="region.name", read_only=True)
    category = serializers.CharField(source="category.name", read_only=True, default=None)
    main_image = serializers.SerializerMethodField()
    main_image_small = serializers.SerializerMethodField()  # 640 px copy for cards

    class Meta:
        model = Place
        fields = [
            "id", "name", "region", "category", "main_image", "main_image_small", "best_season",
            "entrance_fee", "views_count", "average_rating", "reviews_count", "is_favorite", "is_active",
            "latitude", "longitude", "altitude",
        ]

    def get_main_image(self, obj):
        images = list(obj.images.all())  # uses prefetch; ordering puts the main image first
        image = images[0] if images else None
        if not image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(image.image.url) if request else image.image.url

    def get_main_image_small(self, obj):
        images = list(obj.images.all())
        return thumbnail_url(images[0].image, self.context.get("request"), "small") if images else None

class PlaceDetailSerializer(LocalizedNameMixin, PlaceRatingMixin, serializers.ModelSerializer):
    # The original names for the admin edit form; `name` is already in the visitor's language.
    name_ru = serializers.CharField(source="name", read_only=True)
    region = RegionSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    activities = ActivitySerializer(many=True, read_only=True)
    images = PlaceImageSerializer(many=True, read_only=True)
    created_by = UserShortSerializer(read_only=True)

    class Meta:
        model = Place
        fields = [
            "id", "name", "name_ru", "name_en", "name_tg", "description", "region", "category", "activities", "images",
            "address", "how_to_get_there", "latitude", "longitude", "altitude",
            "best_season", "entrance_fee", "views_count", "average_rating", "reviews_count",
            "is_favorite", "is_active", "created_by", "created_at", "updated_at",
        ]

class PlaceWriteSerializer(serializers.ModelSerializer):
    activities = serializers.PrimaryKeyRelatedField(queryset=Activity.objects.all(), many=True, required=False)

    class Meta:
        model = Place
        fields = [
            "id", "name", "name_en", "name_tg", "description", "region", "category", "activities",
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

    def validate(self, attrs):
        # Places on the site must be in Tajikistan; checked when the point is set or changed.
        lat = attrs.get("latitude", getattr(self.instance, "latitude", None))
        lng = attrs.get("longitude", getattr(self.instance, "longitude", None))
        changed = "latitude" in attrs or "longitude" in attrs
        if changed and lat is not None and lng is not None and not in_tajikistan(lat, lng):
            raise serializers.ValidationError({"location": OUTSIDE_TAJIKISTAN})
        return attrs

    def validate_entrance_fee(self, value):
        if value < 0:
            raise serializers.ValidationError("Entrance fee cannot be negative.")
        return value

class ReviewImageSerializer(serializers.ModelSerializer):
    image_small = serializers.SerializerMethodField()

    class Meta:
        model = ReviewImage
        fields = ["id", "image", "image_small"]

    def get_image_small(self, obj):
        return thumbnail_url(obj.image, self.context.get("request"), "small")

class ReviewSerializer(serializers.ModelSerializer):
    MAX_IMAGES = 5

    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    author = UserShortSerializer(source="user", read_only=True)
    place_name = serializers.SerializerMethodField()
    images = ReviewImageSerializer(many=True, read_only=True)
    # Send photos as multipart form data: uploaded_images=<file> several times.
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(validators=image_validators),
        write_only=True,
        required=False,
        max_length=MAX_IMAGES,
    )

    class Meta:
        model = Review
        fields = ["id", "user", "author", "place", "place_name", "rating", "comment", "images", "uploaded_images", "created_at", "updated_at"]

    def get_place_name(self, obj):
        return place_name(obj.place, self.context.get("request"))

    def create(self, validated_data):
        files = validated_data.pop("uploaded_images", [])
        review = super().create(validated_data)
        ReviewImage.objects.bulk_create([ReviewImage(review=review, image=f) for f in files])
        return review

    def update(self, instance, validated_data):
        files = validated_data.pop("uploaded_images", [])
        if instance.images.count() + len(files) > self.MAX_IMAGES:
            raise serializers.ValidationError({"uploaded_images": f"Не больше {self.MAX_IMAGES} фото в одном отзыве."})
        review = super().update(instance, validated_data)
        ReviewImage.objects.bulk_create([ReviewImage(review=review, image=f) for f in files])
        return review

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

OUTSIDE_TAJIKISTAN = "This point is outside Tajikistan. Only places in Tajikistan can be added."


class PlaceSuggestionSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)
    # The point on the map is required: it is how we know the place really is in Tajikistan.
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6)

    class Meta:
        model = PlaceSuggestion
        fields = [
            "id", "user", "name", "description", "region", "category",
            "address", "latitude", "longitude", "image", "status", "admin_comment", "created_at",
        ]
        read_only_fields = ["status", "admin_comment"]

    def validate(self, attrs):
        if not in_tajikistan(attrs["latitude"], attrs["longitude"]):
            raise serializers.ValidationError({"location": OUTSIDE_TAJIKISTAN})
        return attrs

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

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "kind", "text", "link", "is_read", "created_at"]
        read_only_fields = fields
