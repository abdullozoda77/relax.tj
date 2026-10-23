# Architecture

## 1. Big picture

Rohat is a classic **decoupled SPA + REST API** application:

```
                    ┌────────────────────────────── Browser ──────────────────────────────┐
                    │  React SPA (Vite build)                                             │
                    │  pages/ → components/ → context/ (Auth, Ui, Toast) → api.js (fetch)│
                    │  CesiumJS 3D maps · Leaflet picker · Open-Meteo weather (direct)    │
                    └───────────────┬─────────────────────────────────────────────────────┘
                                    │  JSON over HTTPS, "Authorization: Bearer <JWT>"
                                    │  "Accept-Language: ru|tg|en"
                    ┌───────────────▼─────────────────────────────────────────────────────┐
  production:       │ nginx  — serves frontend/dist, /media, /static, /cesium             │
                    │        — proxies /api /admin /swagger /redoc → gunicorn :8031       │
                    └───────────────┬─────────────────────────────────────────────────────┘
                    ┌───────────────▼─────────────────────────────────────────────────────┐
                    │ Django 6.1 + DRF  (core/ settings + 3 apps)                          │
                    │   accounts/   users, roles, JWT, email codes, password reset         │
                    │   places/     catalogue, reviews, favourites, routes, suggestions…   │
                    │   assistant/  AI chat → Gemini or Claude, with tools                 │
                    └──┬──────────────┬───────────────┬─────────────────┬─────────────────┘
                       │              │               │                 │
                 SQLite db     media/ files      Redis (broker)    External HTTP APIs:
                               (+ WebP thumbs)        │            OSRM routing, Nominatim
                                                Celery worker      (OpenStreetMap), Gemini /
                                                + Celery beat      Anthropic, SMTP (Gmail)
```

In **development** there is no nginx: Vite (port 5173) proxies `/api` and `/media` to Django (port 8000), so the
browser sees one origin and CORS is not needed (`frontend/vite.config.js`).

## 2. Backend architecture

### 2.1 Django project layout ("project + apps")

- `core/` is the **project package**: `settings.py`, root `urls.py`, `celery.py`, `wsgi.py`, `asgi.py`.
- Three **apps**, each owning one area of the domain:
  - `accounts` — identity (custom `User` model with `role`), authentication and email.
  - `places` — the business domain (catalogue and everything users do with places).
  - `assistant` — AI chat; it has **no models**, it reads `places` data.

URL tree (`core/urls.py`):

```
/admin/            Django admin
/api/auth/         → accounts.urls
/api/assistant/    → assistant.urls
/api/              → places.urls (DRF DefaultRouter)
/swagger/ /redoc/  → drf-yasg auto docs
/media/…           → uploaded files (Django serves them in dev; nginx in prod)
```

### 2.2 Layers inside an app (DRF style)

| Layer | File | Responsibility |
|---|---|---|
| Model | `models.py` | Tables, fields, constraints (`UniqueConstraint`, `CheckConstraint`) |
| Validation of files | `validators.py` | Image extension + 5 MB limit, reused by every `ImageField` |
| Serializer | `serializers.py` | Input validation, output shape, language of names, computed fields |
| Filter | `filters.py` | `django-filter` `FilterSet`s for query-string filters |
| Permission | `permissions.py` | Role-based access (`IsAdmin`, `IsModerator`, `IsOwner`, …) |
| View / ViewSet | `views.py` | HTTP endpoints; `ModelViewSet` + custom `@action`s |
| Router | `urls.py` | `DefaultRouter` generates REST URLs from ViewSets |
| Signals | `signals.py` | Side effects after save (notifications) |
| Services/helpers | `geo.py`, `thumbnails.py`, `sqlite_like.py`, `emails.py`, `providers.py`, `tools.py`, `knowledge.py` | Logic that is not tied to one endpoint |
| Background tasks | `tasks.py` | Celery tasks (send email, nightly cleanup) |
| Admin | `admin.py` | Django admin configuration |
| Commands | `management/commands/` | `seed`, `make_thumbnails` |
| Tests | `tests.py` | `APITestCase` suites |

### 2.3 Design patterns and techniques used

- **ViewSet + Router (REST resource pattern).** Each resource is a `ModelViewSet` (or a restricted mix of
  `mixins.*`), registered on a `DefaultRouter`. Extra endpoints are `@action`s
  (e.g. `places/{id}/favorite/`, `travel-lists/{id}/copy/`, `suggestions/{id}/approve/`).
- **Different serializers per action.** `PlaceViewSet.get_serializer_class()` returns `PlaceListSerializer` for
  lists, `PlaceDetailSerializer` for one place and `PlaceWriteSerializer` for create/update.
- **Serializer mixins.** `LocalizedNameMixin` (name in the visitor's language) and `PlaceRatingMixin`
  (average rating, review count, `is_favorite`) are shared by list and detail serializers.
- **Query optimisation in one place.** `places_queryset(request)` does `select_related`, `prefetch_related` and
  `annotate(avg_rating, reviews_total, favorites_total, is_favorite_for_user)` once, so serializers never hit the
  database per row (no N+1). Serializers check `hasattr(obj, "avg_rating")` and fall back to a query only if needed.
- **Role-based access control (RBAC).** Three roles: `user`, `moderator`, `admin` (plus Django `is_staff` counts as
  admin). Helpers `is_admin()` / `is_moderator()` are used both in permission classes and inside querysets
  (e.g. admins also see hidden places; moderators see all suggestions).
- **Object-level permissions.** `IsOwner`, `TravelListPermission`, `IsOwnerOrModeratorDeleteOrReadOnly`
  implement `has_object_permission`.
- **Soft delete / soft hide.** Places have `is_active` (hidden places are invisible for non-admins); deleting your
  profile sets `User.is_active = False` instead of deleting rows.
- **Signals (observer pattern).** `post_save` on `Review` notifies users who favourited the place; `post_save` on
  `PlaceSuggestion` notifies admins/moderators.
- **Atomic transactions.** `transaction.atomic()` for multi-step writes: approving a suggestion (create place +
  image + update suggestion + notification), copying a route, setting the main photo, registering
  (user + code + email).
- **`transaction.on_commit`** queues the Celery email only after the DB commit succeeds.
- **Background jobs with graceful fallback.** If `CELERY_BROKER_URL` is empty, `CELERY_TASK_ALWAYS_EAGER=True`
  and emails are sent synchronously — the same code works with and without Redis.
- **Caching** (Django default local-memory cache): road routes for 24 h, Nominatim country lookups for 30 days.
- **Throttling.** Global anon/user rates + scoped rates `auth` (10/min) and `assistant` (15/min).
- **Strategy / provider pattern for AI.** `assistant/providers.py` chooses Gemini or Claude at runtime
  (`active_provider()`); both use the same prompt (`knowledge.py`) and tools (`tools.py`).
- **Tool calling loop (agent loop).** The model may call `get_place_details` / `get_road_route` up to
  `MAX_TOOL_STEPS = 6` times before answering.
- **Lazy thumbnail generation.** `thumbnail_url()` creates a WebP copy the first time it is requested and
  caches it on disk (`media/thumbs/<size>/…`), with an atomic temp-file rename.
- **Database function override.** `sqlite_like.py` replaces SQLite's `LIKE` so `icontains` search is
  case-insensitive for Cyrillic (Russian/Tajik), not only Latin letters.
- **Idempotent seeding.** `seed` uses `get_or_create`, fills only empty fields and adds photos only when a place
  has none, so it can run on every deploy.
- **Security practices.** Hashed email codes (`make_password`), attempt limits, resend cooldown, same response
  whether an email exists or not (no user enumeration), JWT refresh rotation + blacklist, `.env` with
  `chmod 600` on the server, HTTPS cookies when `HTTPS=True`.

### 2.4 Request lifecycle (example: `GET /api/places/?region=2&ordering=-avg_rating`)

1. nginx → gunicorn → Django middleware (Security, **CORS**, Session, Common, CSRF, Auth, …).
2. DRF authenticates with `JWTAuthentication` (if `Authorization: Bearer …` is present).
3. Throttles (`AnonRateThrottle` / `UserRateThrottle`) check the rate.
4. `PlaceViewSet.get_queryset()` → `places_queryset()` (joins, prefetches, annotations, hides inactive places for
   non-admins).
5. Filter backends: `DjangoFilterBackend` (`PlaceFilter`), `SearchFilter` (`?search=`), `OrderingFilter`
   (`?ordering=`).
6. `StandardPagination` (10 per page, `?page_size=` up to 100).
7. `PlaceListSerializer` builds JSON; `name` is chosen from `name`/`name_en`/`name_tg` by `Accept-Language`
   or `?lang=`; `main_image_small` is a 640 px WebP thumbnail URL.

## 3. Frontend architecture

### 3.1 Structure

```
main.jsx ─► App.jsx
             ├─ ToastProvider        (toast messages)
             │  └─ AuthProvider      (current user, login/logout, tokens)
             │     └─ UiProvider     (modals, favourites state, requireLogin, version counters)
             │        ├─ Header (Logo, nav, SearchBox, LanguageSwitcher, ThemeToggle, NotificationBell, UserMenu)
             │        ├─ <Routes> pages/*   (wrapped in PageTransition fade)
             │        ├─ Footer
             │        └─ AssistantChat (floating AI chat)
```

- **Pages** (`src/pages/`) = one per route. They load data with `api()` and compose section components.
- **Feature folders** (`components/home`, `place`, `profile`, `admin`) group components used by one page.
- **Shared components** live directly in `components/` (cards, modal, icons, stars, 3D maps …).
- **Context API** instead of Redux: `AuthContext` (who is logged in), `UiContext` (modals, favourites, refresh
  counters), `ToastContext` (notifications).
- **`api.js`** is the single gateway to the backend: adds JWT + `Accept-Language`, refreshes an expired access
  token once (shared promise so parallel requests do not race), retries as a guest when the login is gone,
  translates server error messages.
- **i18n without a library**: `t("Русский текст")` looks up `translations[lang][text]`; the Russian text itself is
  the key. The language is read once at start; switching reloads the page.
- **Theming**: Tailwind colours are CSS variables (`rgb(var(--c-…) / <alpha>)`); `html.light` swaps them.
  The theme is applied in `index.html` before React mounts (no flash).

### 3.2 Performance techniques

- **Code splitting** with `React.lazy` + `Suspense` for CesiumJS views (`Terrain3D`, `RouteMap3D`, `PlacesMap3D`).
- **`WhenVisible`** (IntersectionObserver) mounts heavy 3D maps only when they scroll near the screen; the home
  3D globe loads only after a button press.
- **Responsive images**: API returns `image_small` (640 px) / `image_medium` (1200 px) WebP; the hero slider uses
  `/hero/small/` (960 px) on phones and preloads only current/next slides.
- **Cesium on phones**: lower resolution scale, coarser terrain tiles, no water/lighting extensions.
- **nginx**: gzip, long cache for hashed `/assets/`, 30-day cache for `/hero`, `/brand`, `/cesium`.

### 3.3 State and data flow

- Server data is fetched per component with `useEffect` + `api()` (no global cache).
- Cross-component refresh uses **version counters** in `UiContext` (`favoritesVersion`, `suggestionsVersion`):
  components put them in their effect dependencies to reload after a change elsewhere.
- Optimistic favourites: `UiContext.favorites` stores `{placeId: bool}` overrides so every heart on the page
  updates at once.
- URL is state where it helps sharing: `?search=` on the home page, `?tab=` in the admin panel,
  `/places/:id`, `/lists/:id`, `/reset-password?uid&token`.
- Browser storage: `localStorage` for `access`/`refresh` tokens, `lang`, `theme`; `sessionStorage` for the AI
  chat history.

## 4. Roles and who can do what

| Action | Guest | User | Moderator | Admin |
|---|:-:|:-:|:-:|:-:|
| Browse places, regions, reviews, public routes, AI chat, road routes | ✔ | ✔ | ✔ | ✔ |
| Favourites, reviews (own), routes (own), suggestions (own), notifications | | ✔ | ✔ | ✔ |
| See all suggestions, approve/reject them | | | ✔ | ✔ |
| Delete any review; see reviews of hidden places | | | ✔ | ✔ |
| Create/edit/hide/delete places, photos, regions, categories, activities | | | | ✔ |
| Users list, change role, block; statistics; see hidden places | | | | ✔ |

`is_staff=True` users are treated as admins everywhere (`places/permissions.py`, `frontend/src/roles.js`).
