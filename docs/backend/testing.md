# Tests

All tests use DRF's `APITestCase` (each test runs in a transaction on a test database).

```bash
python manage.py test                 # everything
python manage.py test places          # one app
python manage.py test assistant.tests.GeminiTests
```

## `places/tests.py`

Base class `PlacesTestCase` clears the cache, creates a region, a category, two places and four users (alice, bob, a moderator, an admin). Users have no passwords; tests log in with `force_authenticate` (faster than hashing).

| Class | Test | What it proves |
|---|---|---|
| `PublicCatalogTests` | `test_search_is_case_insensitive_in_cyrillic_and_english` | `sqlite_like.py` works for Cyrillic |
| | `test_names_follow_the_site_language` | `Accept-Language` / `?lang=` picks `name_en` / `name_tg` |
| | `test_hidden_places_are_not_shown` | `is_active=False` hidden for non-admins |
| | `test_only_admins_change_places` | `IsAdminOrReadOnly` |
| `FavoriteTests` | `test_add_twice_and_remove` | 201 → 200 → 204 → 404 |
| | `test_favorites_need_login` | 401 for guests |
| `ReviewTests` | `test_one_review_per_place` | unique constraint → 400 |
| | `test_only_the_author_edits_and_moderators_delete` | `IsOwnerOrModeratorDeleteOrReadOnly` |
| `TravelListTests` | `test_add_places_in_order_without_duplicates` | `add-place` order and duplicates |
| | `test_nobody_else_can_change_my_route` | ownership |
| | `test_private_routes_are_private_and_public_ones_can_be_copied` | `TravelListPermission`, `copy` |
| `SuggestionTests` | `test_only_places_in_tajikistan` | location validation (Nominatim mocked) |
| | `test_moderator_approves_and_the_author_is_notified` | approve creates Place + Notification |
| | `test_reject_needs_a_reason` | `admin_comment` required |
| `NotificationTests` | `test_unread_count_and_read_all` | notification endpoints |
| `ThumbnailTests` | `test_cards_get_a_small_webp_copy_of_the_photo` | `thumbnails.py` creates a WebP |

## `accounts/tests.py` — `EmailDeliveryTests`
Sending codes without Celery (immediately), with Celery (queued after commit), the `send_email` task, and the
`cleanup` task deleting only expired codes.

## `assistant/tests.py`
See [assistant.md](assistant.md#testspy): not-configured, Gemini tool loop / fallback / quota / bad key, Claude
tool loop / refusal / bad key. External SDKs are mocked.
