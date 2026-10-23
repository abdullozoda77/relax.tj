# Pages (`frontend/src/pages/`)

Each page is one route in `App.jsx`. Pages fetch data with `api()` and compose components.

---

## `Home.jsx` — `/`

The landing page; sections are anchored so the header links (`/#places`, `/#map`, …) scroll to them.

State: `filters` (`region, category, best_season, ordering, is_free, search`), `nearby` (`{title, places}` or null),
`regions`, `categories`.

- `?search=` from the URL is copied into `filters.search` (header search and footer links change it).
- Loads `GET /regions/?page_size=100` and `GET /categories/?page_size=100` once.
- `changeFilters()` leaves "nearby" mode; `resetFilters()` clears everything (and the URL).
- `selectCategory(id)` — from the categories section; scrolls to `#places`.
- `findNearby()` — browser geolocation (8 s timeout) → `showNearby()` → `GET /places/nearby/?lat&lng&radius=100&page_size=12`;
  on failure uses Dushanbe (`38.5598, 68.787`) and shows a toast.
- `copyList(list)` — `POST /travel-lists/{id}/copy/` (login required).

Render order: `Hero` → `PlacesSection` → `MapSection` → `CategoriesSection` → `InfoSection` → `ListsSection`.

## `PlaceDetail.jsx` — `/places/:id`

- Loads `GET /places/{id}/` (404 → "Такое место не найдено.") and `GET /places/{id}/similar/`.
- `summary` — updated by `Reviews` via `onSummary` after a review is added/deleted, so the header rating changes
  without reloading.
- `Terrain3D` is `lazy()`-imported and wrapped in `WhenVisible` + `Suspense` (`Terrain3DSection`).
- Layout: back link to `/#places`, title with stars & review count, `PlaceGallery`, `MetricsBar`, then a 12-column
  grid: main column (8) `Terrain3DSection` (only if the place has coordinates), `WeatherCard`, `LocationCard`,
  `DetailsAccordion`, `GoodToKnow`, `GearChecklist`, `Reviews`; sticky sidebar (4) `PlaceSidebar`; at the bottom
  similar places as `PlaceCard`s.

## `TravelListPage.jsx` — `/lists/:id`

Public page of a route (or own private route).

- Loads `GET /travel-lists/{id}/`. Owner = `list.user.id === user.id`.
- Computes per stop the straight-line distance from the previous stop (`distanceKm`), total length, and highest
  point (`maxAltitude`).
- **Road route**: travel mode switch (car / foot / bike, `TRAVEL_MODES`) → `GET /route/?mode=&points=lng,lat;…`
  for stops with coordinates. Shows total road distance and time, per-leg values ("По дороге", "В пути"); if the
  service fails shows straight-line distances with a hint that roads are 1.3–1.8× longer.
- `RouteMap3D` (lazy + `WhenVisible`) with numbered pins, visited state, the road `path` and mode colour; clicking a
  pin opens the place.
- Actions: **Open in Google Maps** (`googleMapsUrl`), **Share** (`navigator.clipboard.writeText(location.href)`),
  **Copy to me** (`POST /travel-lists/{id}/copy/`), and for the owner **mark visited**
  (`POST /travel-list-places/{id}/toggle-visited/`).
- Small `Stat` component for the summary tiles (stops, visited, length, highest point).

## `Profile.jsx` — `/profile`

- While `!ready` → skeleton; not logged in → lock screen with "Войти".
- Layout: `ProfileHeader`; left column `RouteCard`, `FavoritesCard`; right column `ReviewsCard`,
  `SuggestionsCard`, `SettingsCard`.
- `refreshStats` = `reloadUser()` so the header counters update after changes.

## `AdminPanel.jsx` — `/admin-panel?tab=…`

- `TABS = [id, label, icon, allowedFn]`: `stats` (admin), `suggestions` (moderator), `places` (admin),
  `users` (admin), `reviews` (moderator). Only allowed tabs are shown; an unknown/forbidden `?tab` falls back to
  the first allowed one.
- Not moderator/admin → explanation screen (+ login button for guests).
- Title "Панель управления" (admin) or "Панель модератора"; admins also get a link to the Django admin.
- Renders the selected tab component; `StatsTab` gets `onOpenSuggestions` to jump to the suggestions tab.
- The API checks every role again — the UI hiding is only for convenience.

## `ResetPassword.jsx` — `/reset-password?uid=…&token=…`

Opened from the password reset email. Two password fields (must match) →
`POST /auth/password-reset/confirm/ {uid, token, new_password}`. States: incomplete link, form, done (button
opens the login modal). Reuses `Field` from `AuthModal`.
