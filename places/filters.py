import django_filters

from .models import Place, Review, PlaceSuggestion


class PlaceFilter(django_filters.FilterSet):
    region = django_filters.NumberFilter(field_name="region_id")
    category = django_filters.NumberFilter(field_name="category_id")
    activity = django_filters.NumberFilter(field_name="activities", distinct=True)
    best_season = django_filters.ChoiceFilter(choices=Place.SEASONS)
    min_fee = django_filters.NumberFilter(field_name="entrance_fee", lookup_expr="gte")
    max_fee = django_filters.NumberFilter(field_name="entrance_fee", lookup_expr="lte")
    is_free = django_filters.BooleanFilter(method="filter_is_free")
    min_altitude = django_filters.NumberFilter(field_name="altitude", lookup_expr="gte")
    max_altitude = django_filters.NumberFilter(field_name="altitude", lookup_expr="lte")
    min_rating = django_filters.NumberFilter(field_name="avg_rating", lookup_expr="gte")

    class Meta:
        model = Place
        fields = ["region", "category", "activity", "best_season", "is_active"]

    def filter_is_free(self, queryset, name, value):
        return queryset.filter(entrance_fee=0) if value else queryset.filter(entrance_fee__gt=0)


class ReviewFilter(django_filters.FilterSet):
    min_rating = django_filters.NumberFilter(field_name="rating", lookup_expr="gte")

    class Meta:
        model = Review
        fields = ["place", "user", "rating"]


class PlaceSuggestionFilter(django_filters.FilterSet):
    class Meta:
        model = PlaceSuggestion
        fields = ["status", "region", "category"]
