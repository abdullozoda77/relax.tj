# API reference

Base URL: `/api/`. JSON unless noted. Interactive docs: `/swagger/` and `/redoc/`.

- **Auth header:** `Authorization: Bearer <access>`
- **Language:** `Accept-Language: ru|tg|en` (or `?lang=`) → place names in that language
- **Pagination** (all list endpoints): `?page=`, `?page_size=` (≤ 100) → `{count, next, previous, results}`
- **Search / ordering:** `?search=`, `?ordering=field` or `-field`
- **Throttling:** guests 1000/h, users 5000/h, auth endpoints 10/min, assistant questions 15/min
- **Images:** multipart/form-data; jpg/jpeg/png/webp ≤ 5 MB

Legend for "Who": 🌐 anyone · 👤 logged in · 🛡 moderator or admin · 👑 admin · ✍ owner.

---

## Auth — `/api/auth/`

| Method | URL | Who | Body | Response |
|---|---|---|---|---|
| POST | `register/` | 🌐 | `username, email, password, password2, first_name?, last_name?, phone_number?` | 201 `{detail, email}` — code emailed; 503 if email failed |
| POST | `confirm-email/` | 🌐 | `email, code` (6 digits) | 200 `{user, tokens:{refresh, access}}`; 400 `{code: "..."}` |
| POST | `resend-confirmation/` | 🌐 | `email` | 200 `{detail}`; 429 if < 60 s |
| POST | `login/` | 🌐 | `username, password` | 200 `{refresh, access}`; 401 wrong; 403 `{detail, code:"email_not_confirmed", email}` |
| GET | `google/` | 🌐 | — | 200 `{client_id}` (empty = Google login off) |
| POST | `google/` | 🌐 | `credential` (Google ID token) | 200 / 201 (new account) `{user, tokens:{refresh, access}, created}`; 400 bad token; 403 blocked; 503 not set up |
| POST | `token/refresh/` | 🌐 | `refresh` | 200 `{access, refresh}` (rotated) |
| POST | `logout/` | 👤 | `refresh` | 205 (token blacklisted) |
| GET | `profile/` | 👤 | — | user + `stats{favorites, reviews, travel_lists, suggestions}` |
| PUT/PATCH | `profile/` | 👤 | `email, first_name, last_name, phone_number, avatar, bio` | user |
| DELETE | `profile/` | 👤 | — | 204 (account deactivated) |
| POST | `change-password/` | 👤 | `old_password, new_password` | 200 |
| POST | `password-reset/` | 🌐 | `email` | 200 (always the same text) |
| POST | `password-reset/confirm/` | 🌐 | `uid, token, new_password` | 200 / 400 |
| GET | `users/` | 👑 | filters `role, is_active`; search; ordering `date_joined, username` | paginated users |
| GET/PUT/PATCH | `users/{id}/` | 👑 | `role, is_active` (others read-only) | user (cannot block yourself) |

User object: `id, username, email, first_name, last_name, phone_number, avatar, bio, role, is_staff, date_joined`.

---

## Reference data

| Method | URL | Who | Notes |
|---|---|---|---|
| GET | `regions/`, `regions/{id}/` | 🌐 | + `places_count`; search `name, description` |
| POST/PUT/PATCH/DELETE | `regions/…` | 👑 | multipart for `image`; DELETE → 400 if region has places |
| GET | `regions/{id}/places/` | 🌐 | paginated places of the region |
| GET / write | `categories/…`, `categories/{id}/places/` | 🌐 / 👑 | |
| GET / write | `activities/…`, `activities/{id}/places/` | 🌐 / 👑 | |

## Places

| Method | URL | Who | Notes |
|---|---|---|---|
| GET | `places/` | 🌐 | List (card shape). Filters below |
| POST | `places/` | 👑 | `PlaceWriteSerializer` fields → 201 full detail |
| GET | `places/{id}/` | 🌐 | Full detail; +1 view for non-admins |
| PUT/PATCH | `places/{id}/` | 👑 | → full detail |
| DELETE | `places/{id}/` | 👑 | |
| GET | `places/top-rated/` | 🌐 | only places with reviews, by avg rating |
| GET | `places/popular/` | 🌐 | by favourites, then reviews |
| GET | `places/most-viewed/` | 🌐 | by `views_count` |
| GET | `places/nearby/?lat=&lng=&radius=` | 🌐 | radius km (default 50); each item has `distance_km` |
| GET | `places/{id}/reviews/?rating=` | 🌐 | paginated + `rating_summary{average, total, stars{"5":n…"1":n}}` |
| GET | `places/{id}/images/` | 🌐 | all photos |
| GET | `places/{id}/similar/` | 🌐 | ≤ 6 places, same category or region |
| POST | `places/{id}/favorite/` | 👤 | 201 added / 200 already |
| DELETE | `places/{id}/favorite/` | 👤 | 204 / 404 |

**Place filters:** `region`, `category`, `activity`, `best_season` (spring|summer|autumn|winter|all_year),
`min_fee`, `max_fee`, `is_free` (true/false), `min_altitude`, `max_altitude`, `min_rating`, `is_active`.
**Search fields:** name, name_en, name_tg, description, address, region name, category name, activity names.
**Ordering:** `name, created_at, entrance_fee, altitude, views_count, avg_rating, reviews_total, favorites_total`.

List item: `id, name, region, category, main_image, main_image_small, best_season, entrance_fee, views_count,
average_rating, reviews_count, is_favorite, is_active, latitude, longitude, altitude`.

Detail adds: `name_ru, name_en, name_tg, description, region{…}, category{…}, activities[…], images[{id, image,
image_small, image_medium, is_main}], address, how_to_get_there, created_by, created_at, updated_at`.

Write body: `name, name_en, name_tg, description, region, category, activities[ids], address, how_to_get_there,
latitude, longitude, altitude, best_season, entrance_fee, is_active` (point must be in Tajikistan).

## Place images

| Method | URL | Who | Notes |
|---|---|---|---|
| GET | `place-images/?place=&is_main=` | 🌐 | |
| POST | `place-images/` | 👑 | multipart `place, image, is_main` |
| PATCH/DELETE | `place-images/{id}/` | 👑 | |
| POST | `place-images/{id}/set-main/` | 👑 | makes it the only main photo |

## Reviews

| Method | URL | Who | Notes |
|---|---|---|---|
| GET | `reviews/?place=&user=&rating=&min_rating=` | 🌐 | search `comment, place__name`; ordering `created_at, rating` |
| POST | `reviews/` | 👤 | `place, rating, comment` (+ multipart `uploaded_images` ×≤5); one per place |
| PUT/PATCH | `reviews/{id}/` | ✍ | can add photos (total ≤ 5); cannot change place |
| DELETE | `reviews/{id}/` | ✍ / 🛡 | |
| GET | `reviews/my/` | 👤 | own reviews |

Review: `id, author{id, username, avatar}, place, place_name, rating, comment, images[{id, image, image_small}], created_at, updated_at`.

## Favourites

| Method | URL | Who | Notes |
|---|---|---|---|
| GET | `favorites/?place__region=&place__category=` | 👤 | own; each has `place_detail` |
| POST | `favorites/` | 👤 | `place` |
| GET/DELETE | `favorites/{id}/` | 👤 | |

## Travel lists (routes)

| Method | URL | Who | Notes |
|---|---|---|---|
| GET | `travel-lists/` | 👤 | own lists; filter `is_public`; search `title, description` |
| POST | `travel-lists/` | 👤 | `title, description?, is_public?` |
| GET | `travel-lists/{id}/` | 🌐 if public / ✍ | with `items[…place_detail]` |
| PUT/PATCH/DELETE | `travel-lists/{id}/` | ✍ | |
| GET | `travel-lists/public/` | 🌐 | all public lists |
| POST | `travel-lists/{id}/add-place/` | ✍ | `place, note?, order?` → 201 item; 400 if duplicate |
| DELETE | `travel-lists/{id}/remove-place/{place_id}/` | ✍ | 204 / 404 |
| POST | `travel-lists/{id}/copy/` | 👤 (public or own) | 201 new private list "(копия)" |
| GET | `travel-lists/{id}/progress/` | ✍ / public | `{total, visited, left, percent}` |
| GET/POST | `travel-list-places/` | 👤 | own items; filter `travel_list, is_visited` |
| PATCH/DELETE | `travel-list-places/{id}/` | ✍ | e.g. change `order`, `note` |
| POST | `travel-list-places/{id}/toggle-visited/` | ✍ | |

## Road route

`GET /api/route/?mode=car|foot|bike&points=lng,lat;lng,lat;…` (2–25 points) — 🌐

```json
{"mode": "car", "distance_km": 312.4, "duration_min": 289,
 "legs": [{"distance_km": 150.2, "duration_min": 140}, …],
 "geometry": [[68.78, 38.56], …]}
```
Errors: 400 bad params, 404 no road, 503 routing service down.

## Suggestions

| Method | URL | Who | Notes |
|---|---|---|---|
| GET | `suggestions/?status=&region=&category=` | 👤 (own) / 🛡 (all) | |
| POST | `suggestions/` | 👤 | multipart `name, latitude, longitude` (required, in Tajikistan) `, region?, category?, address?, description?, image?` |
| PUT/PATCH/DELETE | `suggestions/{id}/` | ✍ while pending / 🛡 | |
| POST | `suggestions/{id}/approve/` | 🛡 | `region?, category?, admin_comment?` → 201 `{suggestion, place}` |
| POST | `suggestions/{id}/reject/` | 🛡 | `admin_comment` (required) |

## Notifications

| Method | URL | Who | Notes |
|---|---|---|---|
| GET | `notifications/?is_read=&kind=` | 👤 | own, newest first |
| GET | `notifications/unread-count/` | 👤 | `{count}` |
| POST | `notifications/{id}/read/` | 👤 | |
| POST | `notifications/read-all/` | 👤 | `{detail, count}` |

## Statistics

`GET /api/stats/` — 👑 → `{users, places, active_places, reviews, favorites, travel_lists,
suggestions{pending, approved, rejected}, places_by_region[…], top_places[…]}`

## AI assistant

| Method | URL | Who | Notes |
|---|---|---|---|
| GET | `assistant/` | 🌐 | `{enabled}` |
| POST | `assistant/` | 🌐 (15/min) | `{messages:[{role:"user"|"assistant", content}]}` → `{reply, refused, truncated}`; errors `{code: not_configured|busy|unavailable|too_long, detail}` |

## Other URLs
- `/admin/` — Django admin
- `/swagger/`, `/redoc/` — API docs
- `/media/<path>` — uploaded files and thumbnails
