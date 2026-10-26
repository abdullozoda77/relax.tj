# Features (end to end)

Each feature lists: **where the user sees it → frontend files → API → backend code → models**.

---

## 1. Catalogue of places

**Home page "Места" section** — grid of place cards with filters, sorting, search and "load more".

- Frontend: `pages/Home.jsx`, `components/home/PlacesSection.jsx`, `components/PlaceCard.jsx`,
  `components/PlaceBackground.jsx`, `components/FavoriteButton.jsx`, `components/Stars.jsx`
- API: `GET /api/places/?region=&category=&best_season=&is_free=&ordering=&search=&page=&page_size=`
- Backend: `places/views.py → PlaceViewSet`, `places_queryset()`, `places/filters.py → PlaceFilter`,
  `places/serializers.py → PlaceListSerializer`
- Sort options in the UI: newest (`-created_at`), rating (`-avg_rating`), popular (`-favorites_total`),
  most viewed (`-views_count`), cheapest (`entrance_fee`). Filter "only free" → `is_free=true`.
- Hidden places (`is_active=False`) are shown only to admins.

Other list endpoints: `places/top-rated/`, `places/popular/`, `places/most-viewed/`,
`regions/{id}/places/`, `categories/{id}/places/`, `activities/{id}/places/`.

## 2. Search (3 languages, Cyrillic-aware)

- Header search box shows live suggestions (names starting with the text first), keyboard ↑/↓ + Enter;
  pressing Enter or "all results" puts `?search=` in the home URL and filters the list (400 ms debounce).
- Frontend: `components/SearchBox.jsx`, `pages/Home.jsx` (reads `?search=`)
- Backend: DRF `SearchFilter` over `name, name_en, name_tg, description, address, region__name, category__name,
  activities__name`; `places/sqlite_like.py` makes SQLite `LIKE` case-insensitive for Cyrillic.

## 3. Places near me

- Hero button → browser geolocation → `GET /api/places/nearby/?lat=&lng=&radius=100&page_size=12`.
  If geolocation fails, Dushanbe coordinates are used.
- Backend: `PlaceViewSet.nearby` computes the **haversine** distance (`distance_km`) for each place, sorts and adds
  `distance_km` to each result.

## 4. Place page `/places/:id`

- Frontend: `pages/PlaceDetail.jsx` + `components/place/*`
  - `PlaceGallery` — big photo (1200 px copy) + 3 tiles (more photos or similar places), full-size on click
  - `MetricsBar` — season, altitude, entrance fee, region, category, views
  - `DetailsAccordion` — description, how to get there, activities, address
  - `GoodToKnow` — "what's there" / "keep in mind" derived from the place's data
  - `GearChecklist` — what to take (clothes depend on season)
  - `LocationCard` — OpenStreetMap embed + altitude scale (Dushanbe 800 m → place → Ismoil Somoni Peak 7495 m)
  - `WeatherCard` — current weather + forecast from Open-Meteo for the place's real altitude
  - `Terrain3D` — CesiumJS 3D terrain, camera circles the place (lazy-loaded, mounted when visible)
  - `PlaceSidebar` — price, favourite, "open in OpenStreetMap", share (copies the link)
  - `Reviews` — rating summary (stars 5→1), list, form with photos
  - Similar places — `GET /api/places/{id}/similar/` (same category or region, best rated)
- API: `GET /api/places/{id}/` (increments `views_count` for non-admins with an atomic `F()` update)

## 5. Accounts: registration with email code, login, logout

1. **Register** (`AuthModal` → "Регистрация"): `POST /api/auth/register/` creates the user with
   `email_verified=False` and emails a **6-digit code** (only its hash is stored). No tokens yet.
2. **Confirm** (`CheckEmail` component): `POST /api/auth/confirm-email/ {email, code}` → user + JWT tokens.
   Code lives 15 min, 5 wrong tries max. **Resend** after 60 s: `POST /api/auth/resend-confirmation/`.
3. **Login**: `POST /api/auth/login/` → `{access, refresh}`. If the email is not confirmed → 403
   `{code: "email_not_confirmed", email}` and the UI switches to the code screen.
4. **Token refresh**: `api.js` automatically calls `POST /api/auth/token/refresh/` on a 401.
5. **Logout**: `POST /api/auth/logout/ {refresh}` blacklists the refresh token.
6. **Continue with Google** (`GoogleButton` under the login/register form): Google's button gives an ID token →
   `POST /api/auth/google/ {credential}`. The server verifies it with `google-auth` (audience = `GOOGLE_CLIENT_ID`,
   email must be verified by Google), then logs in the account with that email (marking it confirmed) or creates a
   new one without a password (username from the email, `ali.valiev`, `ali.valiev2`…). Returns `{user, tokens, created}`.
   The button is hidden while `GOOGLE_CLIENT_ID` is empty (`GET /api/auth/google/` returns the client ID).
- Backend: `accounts/views.py`, `accounts/serializers.py`, `accounts/emails.py`, `accounts/models.py`.
- Emails are queued to Celery when Redis is configured (with retries), otherwise sent immediately.

## 6. Password reset and change

- "Забыли пароль?" → `POST /api/auth/password-reset/ {email}` emails
  `FRONTEND_URL/reset-password?uid=…&token=…` (Django `default_token_generator`). Same answer for unknown emails.
- `/reset-password` page (`pages/ResetPassword.jsx`) → `POST /api/auth/password-reset/confirm/`.
- In profile settings: `POST /api/auth/change-password/ {old_password, new_password}`.

## 7. Profile `/profile`

- `ProfileHeader` — avatar, name, join date, counters (`GET /api/auth/profile/` returns `stats`)
- `RouteCard` — my routes (see §9)
- `FavoritesCard` — `GET /api/favorites/`
- `ReviewsCard` — `GET /api/reviews/my/`, delete own review
- `SuggestionsCard` — `GET /api/suggestions/` (own) with status badges and admin comments
- `SettingsCard` — edit name/email/phone/bio (`PATCH /api/auth/profile/`), change password, send reset link
- Delete account: `DELETE /api/auth/profile/` → `is_active=False` (soft delete)

## 8. Favourites

- Heart on every card and on the place page → `POST` / `DELETE /api/places/{id}/favorite/`.
- `UiContext.toggleFavorite` updates all hearts on the page at once and bumps `favoritesVersion`.
- Model `Favorite` with `UniqueConstraint(user, place)`.

## 9. Travel routes (lists) with road navigation

- **Create** in profile: choose "Откуда" and "Куда" from site places → `POST /api/travel-lists/` +
  2× `POST /api/travel-lists/{id}/add-place/`. Title is generated: "A → B".
- **Add stop** before the destination (destination `order` is bumped with `PATCH /api/travel-list-places/{id}/`).
- **Remove stop**: `DELETE /api/travel-lists/{id}/remove-place/{place_id}/`.
- **Mark visited**: `POST /api/travel-list-places/{id}/toggle-visited/`; progress: `GET travel-lists/{id}/progress/`.
- **Public / private** toggle: `PATCH /api/travel-lists/{id}/ {is_public}`.
- **Route page `/lists/:id`** (`pages/TravelListPage.jsx`): stops in order, straight-line distances, total length,
  highest point, **road route** by car / foot / bike from `GET /api/route/?mode=&points=lng,lat;…`
  (OSRM, cached 24 h, line simplified by Ramer–Douglas–Peucker), per-leg distance/time, `RouteMap3D` with numbered
  pins and the road line, "Open in Google Maps", "Share", "Copy to me" (`POST travel-lists/{id}/copy/`).
- **Popular routes** on the home page: `GET /api/travel-lists/public/` (5 ready-made routes created by `seed`).

## 10. Reviews with photos

- One review per user per place (`UniqueConstraint`), rating 1–5 (`CheckConstraint`), comment, up to 5 photos
  (multipart field `uploaded_images` repeated).
- `POST /api/reviews/`, `PATCH/DELETE /api/reviews/{id}/`, list per place `GET /api/places/{id}/reviews/`
  (+ `rating_summary`).
- Author edits/deletes; moderators/admins can only delete (moderation).
- Signal: new review → notification to everyone who has the place in favourites.

## 11. Suggest a new place

- Footer form or user menu → `SuggestModal` (name, point on a **Leaflet** map, region, category, address,
  description, photo). Point must be in Tajikistan: quick box check in the browser, exact check on the server
  (bounding box + **Nominatim** reverse geocoding, cached 30 days).
- `POST /api/suggestions/` (multipart). Signal notifies admins & moderators.
- Moderator: `POST /api/suggestions/{id}/approve/` (optionally choose region/category) creates a `Place` (+ main
  photo from the suggestion) in a transaction and notifies the author;
  `POST /api/suggestions/{id}/reject/ {admin_comment}` (reason required) notifies the author.
- Author can edit/delete only while `pending`.

## 12. Notifications

- Bell in the header (`NotificationBell.jsx`): polls `GET /api/notifications/unread-count/` every 60 s and when
  the tab becomes visible; dropdown loads `GET /api/notifications/?page_size=10`; click → `POST {id}/read/` and
  navigates to `link`; "read all" → `POST /api/notifications/read-all/`.
- Created by signals (new review on a favourite, new suggestion) and by approve/reject.

## 13. 3D maps (CesiumJS)

- **Home "Карта"** (`MapSection` → `PlacesMap3D`): loads after a button press; spinning globe from space,
  Tajikistan as a glowing label, category-coloured pins with Material icons, search & fly-to, back to space.
- **Place terrain** (`Terrain3D`): camera orbits the place at 5°/s, uses real terrain height.
- **Route map** (`RouteMap3D`): numbered pins + road polyline (or dashed straight line).
- Shared setup `components/cesium.js`: viewer quality settings, phone mode, sun position, marker drawing,
  `CATEGORY_COLORS`.

## 14. AI assistant

- Floating chat (`AssistantChat.jsx`), history in `sessionStorage`, suggested questions, renders **bold** and
  internal links `[name](/places/5)` as router links.
- `GET /api/assistant/` → `{enabled}`; `POST /api/assistant/ {messages}` → `{reply, refused, truncated}`.
- Backend builds a system prompt with rules, a site guide and the **whole catalogue** (places, regions, public
  routes); the model can call tools `get_place_details` and `get_road_route`. Gemini first (with fallback models),
  otherwise Claude. Throttled to 15 questions/min.

## 15. Admin / moderator panel `/admin-panel`

Tabs filtered by role (`pages/AdminPanel.jsx`, `?tab=`):

| Tab | Who | API |
|---|---|---|
| Обзор (`StatsTab`) | admin | `GET /api/stats/` — counters, suggestions by status, places by region, top 5 places |
| Предложения (`SuggestionsTab`) | moderator+ | `GET /api/suggestions/?status=`, approve / reject |
| Места (`PlacesTab`) | admin | list/search, create/edit (`PlaceEditor`), hide/show (`PATCH is_active`), delete, photos (`PhotosManager`: upload, set main, delete) |
| Пользователи (`UsersTab`) | admin | `GET/PATCH /api/auth/users/` — change role, block/unblock (cannot block yourself) |
| Отзывы (`ReviewsTab`) | moderator+ | `GET /api/reviews/`, delete |

Plus the classic **Django admin** at `/admin/` for every model.

## 16. Languages and theme

- RU / TJ / EN switcher (`LanguageSwitcher.jsx`, `i18n.js`, `translations.js`); the choice is saved and the page
  reloads. The API receives `Accept-Language` and returns place names in that language.
- Dark (default) / light theme (`ThemeToggle.jsx`), saved in `localStorage`, applied before render.

## 17. Weather

`WeatherCard.jsx` calls Open-Meteo directly from the browser with the place's latitude, longitude and altitude;
WMO weather codes are mapped to text and icons.

## 18. Seed data and thumbnails

- `python manage.py seed` — 5 regions, 9 categories, 7 activities, ~89 places with coordinates, altitudes,
  descriptions, addresses, "how to get there", EN/TG names, photos (`places/seed_photos/`), and 5 public routes
  owned by the `relaxtj` account. Idempotent.
- `python manage.py make_thumbnails` — pre-generates small/medium WebP copies.
