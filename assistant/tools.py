"""Tools the assistant can call: full details of places and road routes between them."""
import json

from django.db.models import Avg, Count

from places.models import Place
from places.views import ROUTING_PROFILES, RoutingError, road_route

from .knowledge import SEASONS

MAX_DETAILS = 5
MAX_ROUTE_PLACES = 10

TOOLS = [
    {
        "name": "get_place_details",
        "description": (
            "Full information about places on the site by their catalog ids: description, how to get there, "
            "address, altitude, activities, coordinates, rating and the latest reviews. "
            f"Up to {MAX_DETAILS} places per call."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "place_ids": {"type": "array", "items": {"type": "integer"}, "description": "Place ids from the catalog."},
            },
            "required": ["place_ids"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "name": "get_road_route",
        "description": (
            "Road distance and travel time through places on the site, in the given order, by car, on foot or by bike. "
            "To start from a city, use a place in that city (for example a place in Dushanbe). "
            f"2 to {MAX_ROUTE_PLACES} places."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "place_ids": {"type": "array", "items": {"type": "integer"}, "description": "Place ids in the order of the trip."},
                "mode": {"type": "string", "enum": list(ROUTING_PROFILES), "description": "car, foot or bike."},
            },
            "required": ["place_ids", "mode"],
            "additionalProperties": False,
        },
        "strict": True,
    },
]


def _place_details(place_ids):
    ids = [i for i in place_ids if isinstance(i, int)][:MAX_DETAILS]
    places = (
        Place.objects.filter(id__in=ids, is_active=True)
        .select_related("region", "category")
        .prefetch_related("activities")
        .annotate(rating=Avg("reviews__rating"), reviews_total=Count("reviews"))
    )
    found = []
    for p in places:
        reviews = p.reviews.select_related("user").order_by("-created_at")[:5]
        found.append({
            "id": p.id,
            "link": f"/places/{p.id}",
            "name": p.name,
            "name_en": p.name_en,
            "name_tg": p.name_tg,
            "region": p.region.name,
            "category": p.category.name if p.category else None,
            "description": p.description,
            "how_to_get_there": p.how_to_get_there,
            "address": p.address,
            "altitude_m": p.altitude,
            "best_season": SEASONS.get(p.best_season, p.best_season),
            "entrance_fee_somoni": float(p.entrance_fee),
            "activities": [a.name for a in p.activities.all()],
            "latitude": float(p.latitude) if p.latitude is not None else None,
            "longitude": float(p.longitude) if p.longitude is not None else None,
            "rating": round(p.rating, 1) if p.rating else None,
            "reviews_total": p.reviews_total,
            "latest_reviews": [{"rating": r.rating, "comment": r.comment, "by": r.user.username} for r in reviews],
        })
    missing = sorted(set(ids) - {p["id"] for p in found})
    return {"places": found, "not_found_ids": missing}


def _road_route(place_ids, mode):
    if mode not in ROUTING_PROFILES:
        return {"error": f"mode must be one of {', '.join(ROUTING_PROFILES)}"}
    ids = [i for i in place_ids if isinstance(i, int)]
    if not 2 <= len(ids) <= MAX_ROUTE_PLACES:
        return {"error": f"give 2 to {MAX_ROUTE_PLACES} place ids"}
    places = {p.id: p for p in Place.objects.filter(id__in=ids, is_active=True)}
    missing = [i for i in ids if i not in places or places[i].latitude is None]
    if missing:
        return {"error": f"these places are unknown or have no coordinates: {missing}"}
    points = [(float(places[i].longitude), float(places[i].latitude)) for i in ids]
    try:
        route = road_route(mode, points)
    except RoutingError as error:
        return {"error": error.detail}
    return {
        "mode": mode,
        "places": [places[i].name for i in ids],
        "distance_km": route["distance_km"],
        "duration_min": route["duration_min"],
        "legs": route["legs"],
        "note": "Times are for an empty road; mountain roads are often slower.",
    }


def run_tool(name, tool_input):
    """Runs a tool and returns (text for the model, is_error)."""
    if name == "get_place_details":
        result = _place_details(tool_input.get("place_ids") or [])
    elif name == "get_road_route":
        result = _road_route(tool_input.get("place_ids") or [], tool_input.get("mode", "car"))
    else:
        return f"Unknown tool {name}", True
    return json.dumps(result, ensure_ascii=False), "error" in result
