import math

from django.db import transaction
from django.db.models import Avg, Count, Exists, Max, OuterRef, ProtectedError, Q, Value, BooleanField
from drf_yasg import openapi
from drf_yasg.utils import no_body, swagger_auto_schema
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.models import User
from .filters import PlaceFilter, PlaceSuggestionFilter, ReviewFilter
from .models import (
    Activity, Category, Favorite, Place, PlaceImage, PlaceSuggestion,
    Region, Review, TravelList, TravelListPlace,
)
from .permissions import IsAdmin, IsAdminOrReadOnly, IsOwner, IsOwnerOrAdminOrReadOnly, is_admin
from .serializers import (
    ActivitySerializer, CategorySerializer, FavoriteSerializer, PlaceDetailSerializer,
    PlaceImageSerializer, PlaceListSerializer, PlaceSuggestionSerializer, PlaceWriteSerializer,
    RegionSerializer, RejectSerializer, ReviewSerializer, SuggestionApproveSerializer,
    TravelListAddPlaceSerializer, TravelListPlaceSerializer, TravelListSerializer,
)

def distance_km(lat1, lng1, lat2, lng2):
    """Distance between two points on Earth (haversine formula)."""
    lat1, lng1, lat2, lng2 = map(math.radians, (lat1, lng1, lat2, lng2))
    a = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(a))

def places_queryset(request):
    """Places with rating, review count, favorite count and is_favorite calculated in one query."""
    qs = (
        Place.objects.select_related("region", "category", "created_by")
        .prefetch_related("images", "activities")
        .annotate(
            avg_rating=Avg("reviews__rating"),
            reviews_total=Count("reviews", distinct=True),
            favorites_total=Count("favorited_by", distinct=True),
        )
    )
    user = request.user
    if user.is_authenticated:
        qs = qs.annotate(is_favorite_for_user=Exists(Favorite.objects.filter(user=user, place=OuterRef("pk"))))
    else:
        qs = qs.annotate(is_favorite_for_user=Value(False, output_field=BooleanField()))
    if not is_admin(user):
        qs = qs.filter(is_active=True)
    return qs

class PlacesOfMixin:
    places_lookup = None

    @action(detail=True, methods=["get"], serializer_class=PlaceListSerializer)
    def places(self, request, pk=None):
        obj = self.get_object()
        qs = places_queryset(request).filter(**{self.places_lookup: obj}).order_by("-created_at")
        page = self.paginate_queryset(qs)
        serializer = PlaceListSerializer(page, many=True, context={"request": request})
        return self.get_paginated_response(serializer.data)

class RegionViewSet(PlacesOfMixin, viewsets.ModelViewSet):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    places_lookup = "region"

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "This region still has places. Move or delete them first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

class CategoryViewSet(PlacesOfMixin, viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]
    places_lookup = "category"

class ActivityViewSet(PlacesOfMixin, viewsets.ModelViewSet):
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    search_fields = ["name", "description"]
    ordering_fields = ["name"]
    places_lookup = "activities"

class PlaceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    filterset_class = PlaceFilter
    search_fields = ["name", "description", "address", "region__name", "category__name", "activities__name"]
    ordering_fields = ["name", "created_at", "entrance_fee", "altitude", "avg_rating", "reviews_total", "favorites_total"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = places_queryset(self.request)
        return qs.distinct() if self.request.query_params.get("search") else qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PlaceDetailSerializer
        if self.action in ("create", "update", "partial_update"):
            return PlaceWriteSerializer
        return PlaceListSerializer

    def detail_response(self, place, status_code=status.HTTP_200_OK):
        place = places_queryset(self.request).get(pk=place.pk)
        return Response(PlaceDetailSerializer(place, context={"request": self.request}).data, status=status_code)

    @swagger_auto_schema(request_body=PlaceWriteSerializer, responses={201: PlaceDetailSerializer})
    def create(self, request, *args, **kwargs):
        serializer = PlaceWriteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        place = serializer.save(created_by=request.user)
        return self.detail_response(place, status.HTTP_201_CREATED)

    @swagger_auto_schema(request_body=PlaceWriteSerializer, responses={200: PlaceDetailSerializer})
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        serializer = PlaceWriteSerializer(self.get_object(), data=request.data, partial=partial, context={"request": request})
        serializer.is_valid(raise_exception=True)
        place = serializer.save()
        return self.detail_response(place)

    @swagger_auto_schema(method="post", request_body=no_body, responses={201: "Added to favorites"})
    @swagger_auto_schema(method="delete", responses={204: "Removed from favorites"})
    @action(detail=True, methods=["post", "delete"], permission_classes=[permissions.IsAuthenticated])
    def favorite(self, request, pk=None):
        place = self.get_object()
        if request.method == "POST":
            _, created = Favorite.objects.get_or_create(user=request.user, place=place)
            if not created:
                return Response({"detail": "Already in favorites."}, status=status.HTTP_200_OK)
            return Response({"detail": "Added to favorites."}, status=status.HTTP_201_CREATED)
        deleted, _ = Favorite.objects.filter(user=request.user, place=place).delete()
        if not deleted:
            return Response({"detail": "This place is not in your favorites."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"], serializer_class=ReviewSerializer, filterset_class=None)
    def reviews(self, request, pk=None):
        place = self.get_object()
        qs = place.reviews.select_related("user")
        rating = request.query_params.get("rating")
        if rating:
            qs = qs.filter(rating=rating)
        page = self.paginate_queryset(qs)
        serializer = ReviewSerializer(page, many=True, context={"request": request})
        response = self.get_paginated_response(serializer.data)
        counts = dict(place.reviews.values_list("rating").annotate(n=Count("id")))
        response.data["rating_summary"] = {
            "average": round(place.avg_rating, 1) if place.avg_rating else None,
            "total": place.reviews_total,
            "stars": {str(star): counts.get(star, 0) for star in range(5, 0, -1)},
        }
        return response

    @action(detail=True, methods=["get"], serializer_class=PlaceImageSerializer, filterset_class=None)
    def images(self, request, pk=None):
        place = self.get_object()
        serializer = PlaceImageSerializer(place.images.all(), many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get"], filterset_class=None)
    def similar(self, request, pk=None):
        place = self.get_object()
        qs = (
            places_queryset(request)
            .filter(Q(category=place.category_id) | Q(region=place.region_id))
            .exclude(pk=place.pk)
            .order_by("-avg_rating", "-favorites_total")[:6]
        )
        return Response(PlaceListSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=False, methods=["get"], url_path="top-rated")
    def top_rated(self, request):
        qs = self.filter_queryset(self.get_queryset()).filter(reviews_total__gt=0).order_by("-avg_rating", "-reviews_total")
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(PlaceListSerializer(page, many=True, context={"request": request}).data)

    @action(detail=False, methods=["get"])
    def popular(self, request):
        qs = self.filter_queryset(self.get_queryset()).order_by("-favorites_total", "-reviews_total")
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(PlaceListSerializer(page, many=True, context={"request": request}).data)

    @swagger_auto_schema(manual_parameters=[
        openapi.Parameter("lat", openapi.IN_QUERY, type=openapi.TYPE_NUMBER, required=True),
        openapi.Parameter("lng", openapi.IN_QUERY, type=openapi.TYPE_NUMBER, required=True),
        openapi.Parameter("radius", openapi.IN_QUERY, type=openapi.TYPE_NUMBER, description="В км, по умолчанию 50"),
    ])
    @action(detail=False, methods=["get"])
    def nearby(self, request):
        """Places within a radius (km) of the given point, closest first."""
        try:
            lat = float(request.query_params["lat"])
            lng = float(request.query_params["lng"])
            radius = float(request.query_params.get("radius", 50))
        except (KeyError, ValueError):
            raise ValidationError({"detail": "Укажите lat и lng числами, radius в км (необязательно)."})
        if not (-90 <= lat <= 90 and -180 <= lng <= 180) or radius <= 0:
            raise ValidationError({"detail": "Неверные координаты или радиус."})

        qs = self.filter_queryset(self.get_queryset()).filter(latitude__isnull=False, longitude__isnull=False)
        found = []
        for place in qs:
            distance = distance_km(lat, lng, float(place.latitude), float(place.longitude))
            if distance <= radius:
                found.append((distance, place))
        found.sort(key=lambda pair: pair[0])

        page = self.paginate_queryset([place for _, place in found])
        data = PlaceListSerializer(page, many=True, context={"request": request}).data
        distances = {place.pk: round(d, 1) for d, place in found}
        for item in data:
            item["distance_km"] = distances[item["id"]]
        return self.get_paginated_response(data)

class PlaceImageViewSet(viewsets.ModelViewSet):
    queryset = PlaceImage.objects.select_related("place")
    serializer_class = PlaceImageSerializer
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ["place", "is_main"]
    ordering_fields = ["created_at"]

    @action(detail=True, methods=["post"], url_path="set-main")
    def set_main(self, request, pk=None):
        image = self.get_object()
        with transaction.atomic():
            PlaceImage.objects.filter(place=image.place, is_main=True).update(is_main=False)
            image.is_main = True
            image.save(update_fields=["is_main"])
        return Response(PlaceImageSerializer(image, context={"request": request}).data)

class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrAdminOrReadOnly]
    filterset_class = ReviewFilter
    search_fields = ["comment", "place__name"]
    ordering_fields = ["created_at", "rating"]

    def get_queryset(self):
        qs = Review.objects.select_related("user", "place")
        if not is_admin(self.request.user):
            qs = qs.filter(place__is_active=True)
        return qs

    def perform_create(self, serializer):
        if not serializer.validated_data["place"].is_active:
            raise ValidationError({"place": "This place is not available."})
        serializer.save()

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def my(self, request):
        qs = self.filter_queryset(Review.objects.filter(user=request.user).select_related("user", "place"))
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(self.get_serializer(page, many=True).data)

class FavoriteViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.RetrieveModelMixin,
                      mixins.DestroyModelMixin, viewsets.GenericViewSet):
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["place__region", "place__category"]
    search_fields = ["place__name"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Favorite.objects.none()
        return Favorite.objects.filter(user=self.request.user).select_related(
            "place__region", "place__category"
        ).prefetch_related("place__images")

    def perform_create(self, serializer):
        if not serializer.validated_data["place"].is_active:
            raise ValidationError({"place": "This place is not available."})
        serializer.save()

class TravelListPermission(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS or view.action == "copy":
            return obj.is_public or obj.user == request.user
        return obj.user == request.user

class TravelListViewSet(viewsets.ModelViewSet):
    serializer_class = TravelListSerializer
    filterset_fields = ["is_public"]
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "updated_at", "title"]

    def get_permissions(self):
        if self.action in ("retrieve", "public"):
            return [TravelListPermission()]
        return [permissions.IsAuthenticated(), TravelListPermission()]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return TravelList.objects.none()
        qs = TravelList.objects.select_related("user").prefetch_related(
            "items__place__region", "items__place__category", "items__place__images"
        )
        user = self.request.user
        if self.action == "list":
            return qs.filter(user=user)
        if self.action == "public":
            return qs.filter(is_public=True)
        if user.is_authenticated:
            return qs.filter(Q(is_public=True) | Q(user=user))
        return qs.filter(is_public=True)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def public(self, request):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(self.get_serializer(page, many=True).data)

    @swagger_auto_schema(request_body=TravelListAddPlaceSerializer, responses={201: TravelListPlaceSerializer})
    @action(detail=True, methods=["post"], url_path="add-place")
    def add_place(self, request, pk=None):
        travel_list = self.get_object()
        serializer = TravelListAddPlaceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        place = serializer.validated_data["place"]
        if travel_list.items.filter(place=place).exists():
            raise ValidationError({"place": "This place is already in the list."})
        order = serializer.validated_data.get("order")
        if order is None:
            order = (travel_list.items.aggregate(m=Max("order"))["m"] or 0) + 1
        item = TravelListPlace.objects.create(
            travel_list=travel_list, place=place, order=order, note=serializer.validated_data["note"]
        )
        travel_list.save(update_fields=["updated_at"])
        return Response(TravelListPlaceSerializer(item, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"remove-place/(?P<place_id>\d+)")
    def remove_place(self, request, pk=None, place_id=None):
        travel_list = self.get_object()
        deleted, _ = travel_list.items.filter(place_id=place_id).delete()
        if not deleted:
            return Response({"detail": "This place is not in the list."}, status=status.HTTP_404_NOT_FOUND)
        travel_list.save(update_fields=["updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @swagger_auto_schema(request_body=no_body, responses={201: TravelListSerializer})
    @action(detail=True, methods=["post"])
    def copy(self, request, pk=None):
        """Copy a public travel list (or your own) into your lists."""
        original = self.get_object()
        with transaction.atomic():
            new_list = TravelList.objects.create(
                user=request.user,
                title=f"{original.title} (copy)",
                description=original.description,
                is_public=False,
            )
            TravelListPlace.objects.bulk_create([
                TravelListPlace(travel_list=new_list, place=item.place, order=item.order, note=item.note)
                for item in original.items.all()
            ])
        new_list = TravelList.objects.prefetch_related("items__place").get(pk=new_list.pk)
        return Response(TravelListSerializer(new_list, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def progress(self, request, pk=None):
        travel_list = self.get_object()
        total = travel_list.items.count()
        visited = travel_list.items.filter(is_visited=True).count()
        return Response({
            "total": total,
            "visited": visited,
            "left": total - visited,
            "percent": round(visited * 100 / total) if total else 0,
        })

class TravelListPlaceViewSet(viewsets.ModelViewSet):
    serializer_class = TravelListPlaceSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    filterset_fields = ["travel_list", "is_visited"]
    ordering_fields = ["order", "added_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return TravelListPlace.objects.none()
        return TravelListPlace.objects.filter(travel_list__user=self.request.user).select_related(
            "travel_list", "place__region", "place__category"
        ).prefetch_related("place__images")

    def perform_create(self, serializer):
        data = serializer.validated_data
        if "order" not in self.request.data:
            last = data["travel_list"].items.aggregate(m=Max("order"))["m"] or 0
            serializer.save(order=last + 1)
        else:
            serializer.save()

    @action(detail=True, methods=["post"], url_path="toggle-visited")
    def toggle_visited(self, request, pk=None):
        item = self.get_object()
        item.is_visited = not item.is_visited
        item.save(update_fields=["is_visited"])
        return Response(self.get_serializer(item).data)

class PlaceSuggestionViewSet(viewsets.ModelViewSet):
    serializer_class = PlaceSuggestionSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_class = PlaceSuggestionFilter
    search_fields = ["name", "description", "address"]
    ordering_fields = ["created_at", "status"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return PlaceSuggestion.objects.none()
        qs = PlaceSuggestion.objects.select_related("user", "region", "category")
        if is_admin(self.request.user):
            return qs
        return qs.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def check_can_change(self, suggestion):
        if is_admin(self.request.user):
            return
        if suggestion.user != self.request.user:
            raise PermissionDenied("This is not your suggestion.")
        if suggestion.status != "pending":
            raise PermissionDenied("You can only change a suggestion while it is pending.")

    def perform_update(self, serializer):
        self.check_can_change(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self.check_can_change(instance)
        instance.delete()

    @swagger_auto_schema(request_body=SuggestionApproveSerializer)
    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def approve(self, request, pk=None):
        suggestion = self.get_object()
        if suggestion.status != "pending":
            raise ValidationError({"detail": f"This suggestion is already {suggestion.status}."})
        serializer = SuggestionApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        region = data.get("region") or suggestion.region
        if region is None:
            raise ValidationError({"region": "Choose a region for this place."})
        category = data["category"] if "category" in data else suggestion.category

        with transaction.atomic():
            place = Place.objects.create(
                name=suggestion.name,
                description=suggestion.description,
                address=suggestion.address,
                region=region,
                category=category,
                created_by=suggestion.user,
            )
            if suggestion.image:
                PlaceImage.objects.create(place=place, image=suggestion.image.name, is_main=True)
            suggestion.status = "approved"
            suggestion.region = region
            suggestion.category = category
            suggestion.admin_comment = data.get("admin_comment", "")
            suggestion.save()

        place = places_queryset(request).get(pk=place.pk)
        return Response(
            {
                "suggestion": PlaceSuggestionSerializer(suggestion, context={"request": request}).data,
                "place": PlaceDetailSerializer(place, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @swagger_auto_schema(request_body=RejectSerializer)
    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def reject(self, request, pk=None):
        suggestion = self.get_object()
        if suggestion.status != "pending":
            raise ValidationError({"detail": f"This suggestion is already {suggestion.status}."})
        serializer = RejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        suggestion.status = "rejected"
        suggestion.admin_comment = serializer.validated_data["admin_comment"]
        suggestion.save(update_fields=["status", "admin_comment"])
        return Response(PlaceSuggestionSerializer(suggestion, context={"request": request}).data)

class StatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        top_places = (
            Place.objects.annotate(avg_rating=Avg("reviews__rating"), reviews_total=Count("reviews"))
            .filter(reviews_total__gt=0)
            .order_by("-avg_rating", "-reviews_total")[:5]
        )
        return Response({
            "users": User.objects.count(),
            "places": Place.objects.count(),
            "active_places": Place.objects.filter(is_active=True).count(),
            "reviews": Review.objects.count(),
            "favorites": Favorite.objects.count(),
            "travel_lists": TravelList.objects.count(),
            "suggestions": {
                "pending": PlaceSuggestion.objects.filter(status="pending").count(),
                "approved": PlaceSuggestion.objects.filter(status="approved").count(),
                "rejected": PlaceSuggestion.objects.filter(status="rejected").count(),
            },
            "places_by_region": list(
                Region.objects.annotate(places_total=Count("places")).values("id", "name", "places_total")
            ),
            "top_places": [
                {"id": p.id, "name": p.name, "average_rating": round(p.avg_rating, 1), "reviews": p.reviews_total}
                for p in top_places
            ],
        })