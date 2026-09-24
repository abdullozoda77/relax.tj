from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("regions", views.RegionViewSet, basename="regions")
router.register("categories", views.CategoryViewSet, basename="categories")
router.register("activities", views.ActivityViewSet, basename="activities")
router.register("places", views.PlaceViewSet, basename="places")
router.register("place-images", views.PlaceImageViewSet, basename="place-images")
router.register("reviews", views.ReviewViewSet, basename="reviews")
router.register("favorites", views.FavoriteViewSet, basename="favorites")
router.register("travel-lists", views.TravelListViewSet, basename="travel-lists")
router.register("travel-list-places", views.TravelListPlaceViewSet, basename="travel-list-places")
router.register("suggestions", views.PlaceSuggestionViewSet, basename="suggestions")

urlpatterns = [
    path("stats/", views.StatsView.as_view(), name="stats"),
    path("", include(router.urls)),
]