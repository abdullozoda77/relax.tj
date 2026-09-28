from unittest import mock

from django.core.cache import cache
from rest_framework.test import APITestCase

from accounts.models import User

from .models import Category, Favorite, Notification, Place, PlaceSuggestion, Region, Review, TravelList


class PlacesTestCase(APITestCase):
    def setUp(self):
        cache.clear()  # throttling counters and cached lookups
        self.region = Region.objects.create(name="Согдийская область")
        self.category = Category.objects.create(name="Озёра")
        self.place = Place.objects.create(
            region=self.region, category=self.category, name="Искандеркуль", name_en="Iskanderkul", name_tg="Искандаркӯл",
            latitude=39.0772, longitude=68.3683,
        )
        self.other_place = Place.objects.create(region=self.region, category=self.category, name="Семь озёр (Маргузор)")
        # No passwords: the tests log in with force_authenticate, and hashing passwords is slow.
        self.alice = User.objects.create_user("alice", "alice@example.com")
        self.bob = User.objects.create_user("bob", "bob@example.com")
        self.moderator = User.objects.create_user("mod", "mod@example.com", role="moderator")
        self.admin = User.objects.create_user("boss", "boss@example.com", role="admin")


class PublicCatalogTests(PlacesTestCase):
    def test_search_is_case_insensitive_in_cyrillic_and_english(self):
        for query in ("искан", "ИСКАН", "iskander"):
            names = [p["name"] for p in self.client.get("/api/places/", {"search": query}).json()["results"]]
            self.assertEqual(names, ["Искандеркуль"], query)

    def test_names_follow_the_site_language(self):
        detail = self.client.get(f"/api/places/{self.place.id}/", HTTP_ACCEPT_LANGUAGE="en").json()
        self.assertEqual(detail["name"], "Iskanderkul")
        detail = self.client.get(f"/api/places/{self.place.id}/", HTTP_ACCEPT_LANGUAGE="tg").json()
        self.assertEqual(detail["name"], "Искандаркӯл")

    def test_hidden_places_are_not_shown(self):
        self.other_place.is_active = False
        self.other_place.save()
        self.assertEqual(self.client.get("/api/places/").json()["count"], 1)
        self.assertEqual(self.client.get(f"/api/places/{self.other_place.id}/").status_code, 404)

    def test_only_admins_change_places(self):
        self.client.force_authenticate(self.alice)
        self.assertEqual(self.client.patch(f"/api/places/{self.place.id}/", {"name": "X"}).status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.patch(f"/api/places/{self.place.id}/", {"description": "Горное озеро."}).status_code, 200)


class FavoriteTests(PlacesTestCase):
    def test_add_twice_and_remove(self):
        self.client.force_authenticate(self.alice)
        url = f"/api/places/{self.place.id}/favorite/"
        self.assertIn(self.client.post(url).status_code, (200, 201))
        self.assertIn(self.client.post(url).status_code, (200, 201, 400))  # a second click must not crash
        self.assertEqual(Favorite.objects.filter(user=self.alice).count(), 1)
        self.assertEqual(self.client.get("/api/favorites/").json()["count"], 1)
        self.assertIn(self.client.delete(url).status_code, (200, 204))
        self.assertEqual(Favorite.objects.filter(user=self.alice).count(), 0)

    def test_favorites_need_login(self):
        self.assertEqual(self.client.post(f"/api/places/{self.place.id}/favorite/").status_code, 401)


class ReviewTests(PlacesTestCase):
    def review(self, rating=5, comment="Очень красиво"):
        return self.client.post("/api/reviews/", {"place": self.place.id, "rating": rating, "comment": comment})

    def test_one_review_per_place(self):
        self.client.force_authenticate(self.alice)
        self.assertEqual(self.review().status_code, 201)
        self.assertEqual(self.review().status_code, 400)  # not a server error
        self.assertEqual(self.review(rating=6).status_code, 400)

    def test_only_the_author_edits_and_moderators_delete(self):
        self.client.force_authenticate(self.alice)
        review_id = self.review().json()["id"]
        self.client.force_authenticate(self.bob)
        self.assertEqual(self.client.patch(f"/api/reviews/{review_id}/", {"comment": "плохо"}).status_code, 403)
        self.assertEqual(self.client.delete(f"/api/reviews/{review_id}/").status_code, 403)
        self.client.force_authenticate(self.moderator)
        self.assertEqual(self.client.delete(f"/api/reviews/{review_id}/").status_code, 204)
        self.assertFalse(Review.objects.exists())


class TravelListTests(PlacesTestCase):
    def make_list(self, user, public=False):
        self.client.force_authenticate(user)
        return self.client.post("/api/travel-lists/", {"title": "Фанские горы", "is_public": public}).json()["id"]

    def test_add_places_in_order_without_duplicates(self):
        list_id = self.make_list(self.alice)
        for place in (self.place, self.other_place):
            self.assertEqual(self.client.post(f"/api/travel-lists/{list_id}/add-place/", {"place": place.id}).status_code, 201)
        self.assertEqual(self.client.post(f"/api/travel-lists/{list_id}/add-place/", {"place": self.place.id}).status_code, 400)
        items = self.client.get(f"/api/travel-lists/{list_id}/").json()["items"]
        self.assertEqual([i["place"] for i in items], [self.place.id, self.other_place.id])

    def test_nobody_else_can_change_my_route(self):
        list_id = self.make_list(self.alice, public=True)
        self.client.force_authenticate(self.bob)
        self.assertEqual(self.client.post(f"/api/travel-lists/{list_id}/add-place/", {"place": self.place.id}).status_code, 403)
        response = self.client.post("/api/travel-list-places/", {"travel_list": list_id, "place": self.place.id})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client.delete(f"/api/travel-lists/{list_id}/").status_code, 403)

    def test_private_routes_are_private_and_public_ones_can_be_copied(self):
        private_id = self.make_list(self.alice)
        public_id = self.make_list(self.alice, public=True)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(f"/api/travel-lists/{private_id}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/travel-lists/{public_id}/").status_code, 200)
        self.assertEqual([r["id"] for r in self.client.get("/api/travel-lists/public/").json()["results"]], [public_id])
        self.client.force_authenticate(self.bob)
        self.assertEqual(self.client.post(f"/api/travel-lists/{public_id}/copy/").status_code, 201)
        self.assertEqual(self.client.post(f"/api/travel-lists/{private_id}/copy/").status_code, 404)
        self.assertEqual(TravelList.objects.filter(user=self.bob).count(), 1)


@mock.patch("places.serializers.in_tajikistan", side_effect=lambda lat, lng: 36.6 <= float(lat) <= 41.1 and 67.3 <= float(lng) <= 75.2)
class SuggestionTests(PlacesTestCase):
    def suggest(self, lat=39.1, lng=68.4):
        self.client.force_authenticate(self.alice)
        return self.client.post("/api/suggestions/", {
            "name": "Озеро Тимурдара", "description": "Бирюзовое озеро", "region": self.region.id,
            "category": self.category.id, "latitude": lat, "longitude": lng,
        })

    def test_only_places_in_tajikistan(self, _geo):
        self.assertEqual(self.suggest(lat=41.3, lng=69.2).status_code, 400)  # Tashkent
        self.assertEqual(self.suggest().status_code, 201)

    def test_moderator_approves_and_the_author_is_notified(self, _geo):
        suggestion_id = self.suggest().json()["id"]
        # Admins and moderators hear about the new suggestion.
        self.assertTrue(Notification.objects.filter(user=self.moderator).exists())
        self.client.force_authenticate(self.bob)
        self.assertEqual(self.client.post(f"/api/suggestions/{suggestion_id}/approve/", {}).status_code, 403)
        self.client.force_authenticate(self.moderator)
        response = self.client.post(f"/api/suggestions/{suggestion_id}/approve/", {})
        self.assertEqual(response.status_code, 201)
        place = Place.objects.get(pk=response.json()["place"]["id"])
        self.assertEqual((place.name, float(place.latitude)), ("Озеро Тимурдара", 39.1))
        self.assertEqual(self.client.post(f"/api/suggestions/{suggestion_id}/approve/", {}).status_code, 400)
        note = Notification.objects.filter(user=self.alice).latest("created_at")
        self.assertEqual(note.link, f"/places/{place.id}")

    def test_reject_needs_a_reason(self, _geo):
        suggestion_id = self.suggest().json()["id"]
        self.client.force_authenticate(self.moderator)
        self.assertEqual(self.client.post(f"/api/suggestions/{suggestion_id}/reject/", {}).status_code, 400)
        self.assertEqual(self.client.post(f"/api/suggestions/{suggestion_id}/reject/", {"admin_comment": "Уже есть"}).status_code, 200)
        self.assertEqual(PlaceSuggestion.objects.get().status, "rejected")


class NotificationTests(PlacesTestCase):
    def test_unread_count_and_read_all(self):
        Notification.objects.create(user=self.alice, text="Привет")
        Notification.objects.create(user=self.alice, text="Ещё")
        Notification.objects.create(user=self.bob, text="Чужое")
        self.client.force_authenticate(self.alice)
        self.assertEqual(self.client.get("/api/notifications/unread-count/").json()["count"], 2)
        self.assertIn(self.client.post("/api/notifications/read-all/").status_code, (200, 204))
        self.assertEqual(self.client.get("/api/notifications/unread-count/").json()["count"], 0)
        self.assertEqual(Notification.objects.filter(user=self.bob, is_read=False).count(), 1)


class ThumbnailTests(PlacesTestCase):
    def test_cards_get_a_small_webp_copy_of_the_photo(self):
        import io
        import shutil
        import tempfile

        from django.core.files.uploadedfile import SimpleUploadedFile
        from django.test import override_settings
        from PIL import Image

        from .models import PlaceImage

        media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, media, ignore_errors=True)
        with override_settings(MEDIA_ROOT=media):
            buffer = io.BytesIO()
            Image.new("RGB", (1920, 1280), (30, 120, 90)).save(buffer, "JPEG")
            PlaceImage.objects.create(place=self.place, is_main=True, image=SimpleUploadedFile("lake.jpg", buffer.getvalue()))

            card = self.client.get("/api/places/", {"search": "искан"}).json()["results"][0]
            self.assertTrue(card["main_image_small"].endswith(".webp"))
            path = card["main_image_small"].split("/media/", 1)[1]
            with Image.open(f"{media}/{path}") as small:
                self.assertEqual(small.size, (640, 427))
            detail = self.client.get(f"/api/places/{self.place.id}/").json()
            self.assertIn("/thumbs/medium/", detail["images"][0]["image_medium"])
            self.assertTrue(detail["images"][0]["image"].endswith(".jpg"))  # the original is still there
