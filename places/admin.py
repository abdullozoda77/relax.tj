from django.contrib import admin
from .models import (
    Region, Category, Place, PlaceImage, Activity, Favorite,
    Review, TravelList, TravelListPlace, PlaceSuggestion,
)

admin.site.register(Region)
admin.site.register(Category)
admin.site.register(Place)
admin.site.register(PlaceImage)
admin.site.register(Activity)
admin.site.register(Favorite)
admin.site.register(Review)
admin.site.register(TravelList)
admin.site.register(TravelListPlace)
admin.site.register(PlaceSuggestion)
