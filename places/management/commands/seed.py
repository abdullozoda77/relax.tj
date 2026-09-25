from django.core.management.base import BaseCommand

from places.models import Activity, Category, Place, Region

REGIONS = [
    ("Душанбе", "Столица Таджикистана"),
    ("Согдийская область", "Север страны, Фанские горы и Худжанд"),
    ("Хатлонская область", "Юг страны, долины и заповедники"),
    ("ГБАО", "Горно-Бадахшанская автономная область, Памир"),
    ("РРП", "Районы республиканского подчинения, Варзоб и Рашт"),
]

CATEGORIES = ["Озёра", "Горы", "Ущелья", "Курорты и санатории", "Исторические места", "Парки"]

ACTIVITIES = ["Походы", "Рыбалка", "Купание", "Кемпинг", "Лыжи", "Фотография", "Экскурсии"]

# name, region, category, activities, lat, lng, altitude, season, fee
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

        created = 0
        for name, region, category, acts, lat, lng, alt, season, fee in PLACES:
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

        self.stdout.write(self.style.SUCCESS(
            f"Регионов: {len(regions)}, категорий: {len(categories)}, "
            f"активностей: {len(activities)}, новых мест: {created}"
        ))
