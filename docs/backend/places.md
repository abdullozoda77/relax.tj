# `places/` — the travel catalogue

The main app. Everything users do with places lives here.

| File | Purpose |
|---|---|
| `models.py` | Region, Category, Activity, Place, PlaceImage, Favorite, Review, ReviewImage, TravelList, TravelListPlace, PlaceSuggestion, Notification |
| `serializers.py` | Input/output for every model, language-aware names, thumbnails, Tajikistan check |
| `views.py` | All ViewSets, road routing (`RouteView`), statistics (`StatsView`), helper functions |
| `urls.py` | `DefaultRouter` + `stats/`, `route/` |
| `filters.py` | `PlaceFilter`, `ReviewFilter`, `PlaceSuggestionFilter` |
| `permissions.py` | `is_admin`, `is_moderator`, `IsAdmin`, `IsAdminOrReadOnly`, `IsModerator`, `IsOwnerOrModeratorDeleteOrReadOnly`, `IsOwner` |
| `pagination.py` | `StandardPagination` |
| `validators.py` | `image_validators` (extension + 5 MB) |
| `signals.py` | Notifications after new reviews and suggestions |
| `geo.py` | Is a point inside Tajikistan? (box + Nominatim) |
| `thumbnails.py` | Lazy WebP thumbnails (`small` 640 px, `medium` 1200 px) |
| `sqlite_like.py` | Unicode case-insensitive `LIKE` for SQLite |
| `place_names.py` | `NAMES`: Russian name → (English, Tajik) for seeded places |
| `apps.py` | `PlacesConfig.ready()` imports `signals` and `sqlite_like` |
| `admin.py` | Django admin for all models (inlines for photos and route items) |
| `management/commands/seed.py` | Fills the database (idempotent) |
| `management/commands/_details.py` | Descriptions/addresses/photos of the first 12 places |
| `management/commands/_new_places.py` | ~77 more places with all data |
| `management/commands/make_thumbnails.py` | Pre-generates thumbnails |
| `seed_photos/` | Photos for `seed`; `CREDITS.md` lists authors & licences (Wikimedia Commons) |
| `migrations/` | 0001…0007 (see [database.md](database.md)) |
| `tests.py` | API tests (see [testing.md](testing.md)) |

---

## `models.py`

Full field list is in [database.md](database.md). Summary:

- **Region** — `name` (unique), `description`, `image`. Ordered by name. `Place.region` uses `PROTECT`, so a region
  with places cannot be deleted.
- **Category** — `name` (unique), `icon`.
- **Activity** — `name` (unique), `description`, `icon`. Many-to-many with Place.
- **Place** — `region` FK, `category` FK (SET_NULL), `activities` M2M, `created_by` FK user, `name`, `name_en`,
  `name_tg`, `description`, `address`, `how_to_get_there`, `latitude`, `longitude`, `altitude` (m),
  `best_season` (`spring|summer|autumn|winter|all_year`), `entrance_fee` (somoni, 0 = free), `views_count`,
  `is_active`, timestamps. Default ordering `-created_at`.
- **PlaceImage** — `place` FK (CASCADE), `image`, `is_main`. Constraint `one_main_image_per_place`
  (partial unique index where `is_main=True`). Ordering `-is_main, id` → main image first.
- **Favorite** — `user`, `place`; `unique_favorite (user, place)`.
- **Review** — `user`, `place`, `rating` 1..5 (validators + `CheckConstraint rating_1_to_5`), `comment`;
  `unique_review (user, place)`.
- **ReviewImage** — `review` FK, `image`.
- **TravelList** — `user`, `title`, `description`, `is_public`.
- **TravelListPlace** — `travel_list` FK (`related_name="items"`), `place`, `order`, `note`, `is_visited`;
  `unique_travel_list_place`. Ordering `order, id`.
- **PlaceSuggestion** — `user`, `region`, `category`, `name`, `description`, `address`, `latitude`, `longitude`,
  `image`, `status` (`pending|approved|rejected`), `admin_comment`.
- **Notification** — `user`, `kind` (`suggestion|review|system`), `text`, `link` (frontend path), `is_read`.

---

## `serializers.py`

### Language helpers
- `request_language(request)` → `"en"`, `"tg"` or `"ru"` from `?lang=` or the `Accept-Language` header (first 2 chars).
- `place_name(place, request)` → `name_en`/`name_tg` if present, else Russian `name`.
- `LocalizedNameMixin` — `name = SerializerMethodField()` using `place_name`.

### Serializers
| Serializer | Notes |
|---|---|
| `RegionSerializer` | + `places_count` (active places) |
| `CategorySerializer`, `ActivitySerializer` | plain |
| `PlaceImageSerializer` | + `image_small`, `image_medium` (thumbnail URLs). `validate()` forbids a second main image |
| `PlaceRatingMixin` | `average_rating` (rounded to 0.1), `reviews_count`, `is_favorite` — use annotations if present (`avg_rating`, `reviews_total`, `is_favorite_for_user`) else query |
| `PlaceListSerializer` | For cards: `id, name, region (name), category (name), main_image, main_image_small, best_season, entrance_fee, views_count, average_rating, reviews_count, is_favorite, is_active, latitude, longitude, altitude`. Uses the prefetched `images` (first = main) |
| `PlaceDetailSerializer` | Full place: nested `region`, `category`, `activities`, `images`, `created_by`; `name_ru`, `name_en`, `name_tg` for the admin form |
| `PlaceWriteSerializer` | Create/update: `activities` as ids; validates lat −90..90, lng −180..180, fee ≥ 0, and that a changed point is in Tajikistan (`in_tajikistan`) |
| `ReviewImageSerializer` | `id, image, image_small` |
| `ReviewSerializer` | `user` = `HiddenField(CurrentUserDefault())`, `author` (short user), `place_name`, `images`, write-only `uploaded_images` (list of up to 5 images). `create`/`update` bulk-create `ReviewImage`s; update checks the total ≤ 5; a review cannot be moved to another place |
| `FavoriteSerializer` | `user` hidden, `place` id, `place_detail` (PlaceListSerializer) |
| `TravelListPlaceSerializer` | `place_detail`; `validate_travel_list` → must be your list |
| `TravelListSerializer` | `user` (short), `items`, `places_count` |
| `PlaceSuggestionSerializer` | `latitude`/`longitude` **required**; `validate()` → must be in Tajikistan; `status`, `admin_comment` read-only |
| `PlaceSuggestionReviewSerializer` | status must not be `pending` (not used by views now) |
| `SuggestionApproveSerializer` | optional `region`, `category` (nullable), `admin_comment` |
| `RejectSerializer` | `admin_comment` required |
| `TravelListAddPlaceSerializer` | `place` (active only), `note`, `order` (≥ 0, optional) |
| `NotificationSerializer` | all fields read-only |

`OUTSIDE_TAJIKISTAN` — the error text (translated on the frontend in `api.js`).

---

## `views.py`

### Helpers
- `distance_km(lat1, lng1, lat2, lng2)` — **haversine** formula, Earth radius 6371 km.
- `places_queryset(request)` — the optimised base queryset:
  `select_related("region", "category", "created_by")`, `prefetch_related("images", "activities")`,
  `annotate(avg_rating=Avg, reviews_total=Count(distinct), favorites_total=Count(distinct))`,
  `is_favorite_for_user = Exists(Favorite…)` (or `Value(False)` for guests), and `is_active=True` for non-admins.
- `PlacesOfMixin` — adds `GET {id}/places/` to Region/Category/Activity ViewSets using `places_lookup`.

### ViewSets
| ViewSet | Base / permissions | Extra |
|---|---|---|
| `RegionViewSet` | ModelViewSet, `IsAdminOrReadOnly`, multipart | `destroy` → 400 if the region still has places (`ProtectedError`); `places` action |
| `CategoryViewSet` | same | `places` action |
| `ActivityViewSet` | same | `places` action |
| `PlaceViewSet` | ModelViewSet, `IsAdminOrReadOnly`, `PlaceFilter`, search, ordering | see below |
| `PlaceImageViewSet` | ModelViewSet, `IsAdminOrReadOnly`, multipart; filter `place, is_main` | `POST {id}/set-main/` (atomic: unset others, set this) |
| `ReviewViewSet` | ModelViewSet, `IsAuthenticatedOrReadOnly` + `IsOwnerOrModeratorDeleteOrReadOnly`; `ReviewFilter` | non-moderators see reviews of active places only; cannot review a hidden place; `GET my/` |
| `FavoriteViewSet` | list/create/retrieve/destroy, `IsAuthenticated` | own favourites only; filter by region/category |
| `TravelListViewSet` | ModelViewSet + `TravelListPermission` | see below |
| `TravelListPlaceViewSet` | ModelViewSet, `IsAuthenticated` + `IsOwner` | auto `order = max + 1` if not given; `POST {id}/toggle-visited/` |
| `PlaceSuggestionViewSet` | ModelViewSet, `IsAuthenticated`, multipart, `PlaceSuggestionFilter` | moderators see all, users their own; users edit/delete only while pending (`check_can_change`); `approve`, `reject` |
| `NotificationViewSet` | list only, `IsAuthenticated` | `GET unread-count/`, `POST {id}/read/`, `POST read-all/` |

#### `PlaceViewSet` in detail
- `get_queryset()` → `places_queryset()` (+ `.distinct()` when searching, because of M2M joins).
- `get_serializer_class()` → Detail for `retrieve`, Write for `create/update/partial_update`, List otherwise.
- `retrieve()` → `views_count = F("views_count") + 1` for non-admins (race-free).
- `create()` / `update()` → validate with `PlaceWriteSerializer`, save (`created_by=request.user`), respond with the
  full `PlaceDetailSerializer` (`detail_response`).
- `favorite` (POST/DELETE, IsAuthenticated) → `get_or_create` / delete; 201/200/204/404.
- `reviews` → paginated reviews (optional `?rating=`) + `rating_summary {average, total, stars{"5".."1"}}`.
- `images` → all photos.
- `similar` → up to 6 places with the same category **or** region, best rated first.
- `top_rated` (`top-rated/`), `most_viewed` (`most-viewed/`), `popular` → ordered lists, filters still apply.
- `nearby` → `?lat=&lng=&radius=` (km, default 50): Python loop with `distance_km`, sorted, paginated, each item
  gets `distance_km`.

#### `TravelListViewSet` in detail
- Permissions: `retrieve` and `public` need only `TravelListPermission` (public lists visible to guests); everything
  else also requires login. `TravelListPermission`: read / `copy` allowed if public or own; writes only own.
- Queryset: `list` → own lists; `public` → public lists; others → public + own.
- `perform_create` → `user=request.user`.
- `add_place` (POST) → no duplicates; default `order = max + 1`; touches `updated_at`.
- `remove_place` (DELETE `remove-place/<place_id>/`).
- `copy` (POST, atomic) → new private list "<title> (копия)" with the same items.
- `progress` (GET) → `{total, visited, left, percent}`.

#### `PlaceSuggestionViewSet.approve`
Only for `pending`. Region from the request or the suggestion (required). In one transaction: create `Place`
(created_by = author), create main `PlaceImage` reusing the suggestion's file, mark approved with comment, create a
`Notification` for the author with a link to the new place. Returns `{suggestion, place}` (201).

#### `reject`
Requires `admin_comment`; sets `rejected`, notifies the author (link `/profile`).

### Road routing
- `ROUTING_URL = https://routing.openstreetmap.de/routed-{mode}/route/v1/{profile}/{coords}?overview=full&geometries=geojson`
  (public OSRM servers by FOSSGIS, no key). Profiles: `car→driving`, `foot→foot`, `bike→bike`.
- `simplify_line(points, tolerance=0.00015)` — iterative **Ramer–Douglas–Peucker** (~15 m tolerance): a road of
  thousands of points becomes a few hundred.
- `RoutingError(status_code, detail)` — 503 when OSRM is down, 404 when there is no road.
- `road_route(mode, points)` → `{mode, distance_km, duration_min, legs[{distance_km, duration_min}], geometry[[lng,lat]…]}`,
  cached for 24 h by the coordinates string. Also used by the AI assistant tool.
- `RouteView` — `GET /api/route/?mode=car&points=lng,lat;lng,lat;…` (2–25 points), AllowAny.

### `StatsView` (IsAdmin)
`GET /api/stats/` → `users, places, active_places, reviews, favorites, travel_lists,
suggestions{pending, approved, rejected}, places_by_region[{id, name, places_total}], top_places[5]`.

---

## `filters.py`
- `PlaceFilter`: `region`, `category`, `activity` (M2M, distinct), `best_season`, `min_fee`/`max_fee`, `is_free`
  (custom method: `entrance_fee=0` or `>0`), `min_altitude`/`max_altitude`, `min_rating` (on the `avg_rating`
  annotation), `is_active`.
- `ReviewFilter`: `place`, `user`, `rating`, `min_rating`.
- `PlaceSuggestionFilter`: `status`, `region`, `category`.

## `permissions.py`
- `is_admin(user)` → authenticated and (`is_staff` or `role == "admin"`).
- `is_moderator(user)` → admin or `role == "moderator"`.
- `IsAdmin`, `IsAdminOrReadOnly` (safe methods for everyone), `IsModerator`.
- `IsOwnerOrModeratorDeleteOrReadOnly` — reviews: author may edit/delete; moderator may only DELETE.
- `IsOwner` — owner is `obj.travel_list.user` for route items, else `obj.user`.

## `pagination.py`
`StandardPagination(PageNumberPagination)`: `page_size=10`, `?page_size=` (max 100). Responses look like
`{count, next, previous, results}`.

## `validators.py`
`validate_image_extension` (jpg, jpeg, png, webp) + `validate_image_size` (≤ 5 MB) → `image_validators` list used
on every `ImageField` in the project.

## `signals.py`
- `notify_about_new_review` (`post_save` Review, created) → `bulk_create` a `review` notification for every user who
  favourited the place (except the author).
- `notify_about_new_suggestion` (`post_save` PlaceSuggestion, created) → `suggestion` notification for all active
  admins/moderators/staff (except the author), link `/admin-panel?tab=suggestions`.

## `geo.py`
- `BOX = lat 36.6–41.1, lng 67.3–75.2` (bounding box of Tajikistan).
- `in_tajikistan_box(lat, lng)` — quick check.
- `country_code(lat, lng)` — Nominatim reverse geocoding (`zoom=3`), cached 30 days per point (4 decimals);
  returns `None` if the service fails.
- `in_tajikistan(lat, lng)` — outside the box → False; inside → `country_code == "tj"`; if Nominatim is down, the box
  alone decides (so adding places keeps working).

## `thumbnails.py`
`thumbnail_url(image_field, request=None, size="small")`: path `media/thumbs/<size>/<original>.webp`. If missing,
opens the original with Pillow, fixes EXIF rotation (`ImageOps.exif_transpose`), converts to RGB, `thumbnail()` to
640 or 1200 px (LANCZOS), saves WebP q=78 to a temp file and atomically renames it. On error returns the original URL.
Returns an absolute URL when a request is available.

## `sqlite_like.py`
SQLite's built-in `LIKE` ignores case only for ASCII, so `"искан"` didn't match `"Искандеркуль"`.
On every new SQLite connection (`connection_created` signal) it registers Python functions `like(pattern, value[, escape])`
that convert the LIKE pattern to a regex (`%`→`.*`, `_`→`.`, escape handling) with `re.IGNORECASE`, cached by
`lru_cache(512)`. All `icontains/contains/startswith` lookups and `?search=` become Unicode case-insensitive.

## `admin.py`
Registers every model. `PlaceAdmin`: list filters, `list_editable=["is_active"]`, `filter_horizontal` activities,
autocomplete region/category/created_by, `PlaceImageInline`. `ReviewAdmin` with `ReviewImageInline`.
`TravelListAdmin` with `TravelListPlaceInline`. Also Region, Category, Activity, PlaceImage, Favorite,
TravelListPlace, PlaceSuggestion, Notification.

## Management commands

### `seed`
1. `get_or_create` 5 `REGIONS` (Душанбе, Согдийская область, Хатлонская область, ГБАО, РРП), 9 `CATEGORIES`
   (Озёра, Горы, Ущелья, Курорты и санатории, Исторические места, Парки, Музеи, Долины, Перевалы и дороги),
   7 `ACTIVITIES` (Походы, Рыбалка, Купание, Кемпинг, Лыжи, Фотография, Экскурсии).
2. Places: 12 from `PLACES` tuples + all `NEW_PLACES` dicts → `get_or_create` by name (activities set only for new
   ones). Fills `name_en`/`name_tg` from `NAMES` when both are empty.
3. `add_details()` — fills empty `description/address/how_to_get_there`; adds photos from `seed_photos/<folder>/`
   only if the place has none (first photo = main).
4. `add_routes()` — creates missing public routes (`ROUTES`: Фанские горы за 3 дня, Памирский тракт, Душанбе за один
   день, Север: Худжанд и Истаравшан, Юг: Хатлон) owned by user `relaxtj` (unusable password).
5. Prints counts.

### `make_thumbnails`
Generates `small` + `medium` for every `PlaceImage` and `small` for every `ReviewImage`.
