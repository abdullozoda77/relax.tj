from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand

from places.models import Activity, Category, Place, PlaceImage, Region

from ._details import DETAILS
from ._new_places import NEW_PLACES

PHOTOS_DIR = Path(__file__).resolve().parents[2] / "seed_photos"

REGIONS = [
    ("Душанбе", "Столица Таджикистана"),
    ("Согдийская область", "Север страны, Фанские горы и Худжанд"),
    ("Хатлонская область", "Юг страны, долины и заповедники"),
    ("ГБАО", "Горно-Бадахшанская автономная область, Памир"),
    ("РРП", "Районы республиканского подчинения, Варзоб и Рашт"),
]

CATEGORIES = [
    "Озёра", "Горы", "Ущелья", "Курорты и санатории", "Исторические места", "Парки",
    "Музеи", "Долины", "Перевалы и дороги",
]

ACTIVITIES = ["Походы", "Рыбалка", "Купание", "Кемпинг", "Лыжи", "Фотография", "Экскурсии"]

# The first places of the project: name, region, category, activities, lat, lng, altitude, season, fee.
# Details and photos for them are in _details.py; all other places are in _new_places.py.
PLACES = [
    ("Искандеркуль", "Согдийская область", "Озёра", ["Походы", "Кемпинг", "Фотография"],
     39.0772, 68.3683, 2195, "summer", 0),
    ("Семь озёр (Маргузор)", "Согдийская область", "Озёра", ["Походы", "Кемпинг", "Фотография"],
     39.1400, 67.9200, 1640, "summer", 20),
    ("Искандердарья", "Согдийская область", "Ущелья", ["Походы", "Фотография"],
     39.0600, 68.4100, 2000, "summer", 0),
    ("Искусственное озеро Кайраккум", "Согдийская область", "Курорты и санатории", ["Купание", "Рыбалка"],
     40.3000, 69.8000, 347, "summer", 0),
    ("Варзобское ущелье", "РРП", "Ущелья", ["Походы", "Купание", "Кемпинг"],
     38.8300, 68.8300, 1200, "summer", 0),
    ("Сафеддара", "РРП", "Горы", ["Лыжи", "Фотография"],
     39.0500, 68.9200, 1900, "winter", 150),
    ("Санаторий Ходжа-Оби-Гарм", "РРП", "Курорты и санатории", ["Экскурсии"],
     38.9000, 68.8000, 1800, "all_year", 0),
    ("Озеро Сарез", "ГБАО", "Озёра", ["Походы", "Фотография"],
     38.2500, 72.7500, 3263, "summer", 0),
    ("Гарм-Чашма", "ГБАО", "Курорты и санатории", ["Купание"],
     37.0900, 71.5600, 2325, "all_year", 30),
    ("Заповедник Тигровая балка", "Хатлонская область", "Парки", ["Экскурсии", "Фотография"],
     37.2500, 68.5000, 320, "spring", 20),
    ("Крепость Хульбук", "Хатлонская область", "Исторические места", ["Экскурсии"],
     37.8000, 69.6700, 580, "all_year", 10),
    ("Парк Рудаки", "Душанбе", "Парки", ["Фотография"],
     38.5767, 68.7806, 800, "all_year", 0),
]


class Command(BaseCommand):
    help = "Заполняет базу регионами, категориями, активностями и местами Таджикистана"

    def handle(self, *args, **options):
        regions = {name: Region.objects.get_or_create(name=name, defaults={"description": desc})[0]
                   for name, desc in REGIONS}
        categories = {name: Category.objects.get_or_create(name=name)[0] for name in CATEGORIES}
        activities = {name: Activity.objects.get_or_create(name=name)[0] for name in ACTIVITIES}

        # Both lists are turned into the same shape: (name, region, category, activities, lat, lng, altitude, season, fee)
        all_places = list(PLACES) + [
            (p["name"], p["region"], p["category"], p["activities"], p["lat"], p["lng"], p["altitude"], p["season"], p["fee"])
            for p in NEW_PLACES
        ]
        details = dict(DETAILS)
        for p in NEW_PLACES:
            details[p["name"]] = {
                "description": p["description"],
                "address": p["address"],
                "how_to_get_there": p["how_to_get_there"],
                "photos": (p["slug"], [p["photo"]]) if p["photo"] else None,
            }

        created = 0
        for name, region, category, acts, lat, lng, alt, season, fee in all_places:
            place, is_new = Place.objects.get_or_create(
                name=name,
                defaults={
                    "region": regions[region],
                    "category": categories[category],
                    "latitude": lat,
                    "longitude": lng,
                    "altitude": alt,
                    "best_season": season,
                    "entrance_fee": fee,
                },
            )
            if is_new:
                place.activities.set(activities[a] for a in acts)
                created += 1

        photos_added = sum(self.add_details(name, info) for name, info in details.items())

        self.stdout.write(self.style.SUCCESS(
            f"Регионов: {len(regions)}, категорий: {len(categories)}, "
            f"активностей: {len(activities)}, новых мест: {created}, новых фото: {photos_added}"
        ))

    def add_details(self, name, info):
        """Fills empty text fields and adds photos if the place has none yet. Returns the number of photos added."""
        place = Place.objects.filter(name=name).first()
        if not place:
            return 0
        changed = [field for field in ("description", "address", "how_to_get_there") if not getattr(place, field)]
        for field in changed:
            setattr(place, field, info[field])
        if changed:
            place.save(update_fields=changed)

        if place.images.exists() or not info["photos"]:
            return 0
        folder, files = info["photos"]
        for i, filename in enumerate(files):
            with open(PHOTOS_DIR / folder / filename, "rb") as f:
                PlaceImage.objects.create(place=place, image=File(f, name=filename), is_main=i == 0)
        return len(files)
