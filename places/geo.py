"""Is a point inside Tajikistan? Used to allow only places in Tajikistan on the site."""
import json
import urllib.parse
import urllib.request

from django.core.cache import cache

# A box around Tajikistan. Points outside it are certainly abroad; points inside may still be in a
# neighbouring country (Uzbekistan, Kyrgyzstan, Afghanistan), so they are checked with OpenStreetMap.
BOX = {"lat": (36.6, 41.1), "lng": (67.3, 75.2)}
NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"


def in_tajikistan_box(lat, lng):
    return BOX["lat"][0] <= lat <= BOX["lat"][1] and BOX["lng"][0] <= lng <= BOX["lng"][1]


def country_code(lat, lng):
    """Two-letter country code of the point from OpenStreetMap (Nominatim), or None if the service fails."""
    key = f"country:{lat:.4f},{lng:.4f}"
    code = cache.get(key)
    if code is None:
        query = urllib.parse.urlencode({"lat": f"{lat:.6f}", "lon": f"{lng:.6f}", "format": "json", "zoom": 3})
        try:
            req = urllib.request.Request(f"{NOMINATIM_URL}?{query}", headers={"User-Agent": "Rohat travel site"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                code = (json.load(resp).get("address") or {}).get("country_code", "")
        except (OSError, ValueError):
            return None
        cache.set(key, code, 60 * 60 * 24 * 30)
    return code


def in_tajikistan(lat, lng):
    lat, lng = float(lat), float(lng)
    if not in_tajikistan_box(lat, lng):
        return False
    code = country_code(lat, lng)
    # If OpenStreetMap does not answer, the box check alone decides, so adding places still works.
    return True if code is None else code == "tj"
