# Components (`frontend/src/components/`)

## Shared components (root of `components/`)

### Layout
| File | Exports | What it does |
|---|---|---|
| `Header.jsx` | `Header` | Fixed top bar. `NAV` links (`/#top`, `/#places`, `/#map`, `/#categories`, `/#lists`, `/#info`). Hook `useOverHero()` — on the home page while the hero is under it (`scrollY < 0.9 × innerHeight`) the header becomes a floating **liquid-glass** bar, otherwise a solid blurred bar. Contains `Logo`, nav, `SearchBox`, `LanguageSwitcher`, `ThemeToggle`, `NotificationBell`, `UserMenu` |
| `Footer.jsx` | `Footer` | About text, region links (`/?search=Согд#places` …), section links, Swagger link, a mini "suggest a place" form (name → opens `SuggestModal` with that name), copyright |
| `Logo.jsx` | `Logo` | Round badge (`LogoMark`) + "Rohat" text with a green dot, links home |
| `UserMenu.jsx` | `UserMenu` | Guest → "Войти" button (opens `AuthModal`). Logged in → avatar dropdown: Мой профиль, Предложить место, Панель управления / модератора (by role), Выйти. Closes on outside click |
| `LanguageSwitcher.jsx` | `LanguageSwitcher` | RU / TJ / EN; calls `setLang()` (saves + reloads) |
| `ThemeToggle.jsx` | `ThemeToggle` | Toggles `html.light`, saves `localStorage.theme` |
| `NotificationBell.jsx` | `NotificationBell` | Unread badge (`GET /notifications/unread-count/`, every 60 s and on tab focus), dropdown with latest 10, `timeAgo()` formatting, icons per kind, mark one / all read, click navigates to `link` |
| `SearchBox.jsx` | `SearchBox` | Live search: `GET /places/?search=&page_size=12`, sorted so names starting with the text come first; ↑/↓/Enter/Escape; Enter without a choice → `/?search=…#places`; 400 ms debounce updates the home list; syncs with URL changes; `onMouseDown` prevented so clicks land before blur |
| `AssistantChat.jsx` | `AssistantChat` | Floating AI chat (see below) |

### Building blocks
| File | Exports | What it does |
|---|---|---|
| `Icon.jsx` | `Icon({name, filled, className, size})` | Material Symbols icon (`FILL` axis for filled) |
| `Modal.jsx` | `Modal({onClose, wide, children})` | Overlay dialog; Escape closes; locks body scroll |
| `Stars.jsx` | `Stars({rating, size})` | 5 stars, filled by rating |
| `PlaceCard.jsx` | `PlaceCard({place})`, `SkeletonCards({count})` | Card: photo/background, favourite heart, category, region, rating, fee, season; links to `/places/:id`. Skeleton placeholders while loading |
| `PlaceBackground.jsx` | `PlaceBackground` | `main_image_small` (fallback `main_image`) or the category gradient + icon from `categoryStyle()` |
| `FavoriteButton.jsx` | `FavoriteButton({place, large})` | Round heart on cards or a big button; uses `useUi().isFavorite/toggleFavorite` |
| `Reveal.jsx` | `Reveal({delay, children})` | IntersectionObserver: adds `.reveal-in` the first time it's visible (fade + slide up), optional stagger delay |
| `WhenVisible.jsx` | `WhenVisible({children, placeholder, margin="300px"})` | Renders children only when near the viewport (used for heavy 3D maps); falls back to visible if no IntersectionObserver |
| `LocationPicker.jsx` | `LocationPicker({value, onChange})` | **Leaflet** map of Tajikistan with OSM tiles; click to set a point (circle marker), "my location" button via geolocation |

### Modals (opened through `UiContext`)
| File | Exports | What it does |
|---|---|---|
| `AuthModal.jsx` | default `AuthModal({tab, onClose})`, `Field`, `inputClass`, `CheckEmail` | Tabs **Вход** / **Регистрация**. Login via `useAuth().login`; if the server answers `email_not_confirmed` it switches to `CheckEmail`. Register via `useAuth().register` → `CheckEmail`. `CheckEmail` — 6-digit code input → `POST /auth/confirm-email/` → `loginWithTokens`; "send again" (`POST /auth/resend-confirmation/`) with a 60 s countdown. `ForgotPassword` → `POST /auth/password-reset/` |
| `SuggestModal.jsx` | default `SuggestModal({name, onClose})`, `SUGGESTION_STATUSES`, `StatusBadge` | Form: name*, location* (`LocationPicker`), region, category, address, description, photo. Checks the point with `inTajikistanBox` before sending; `POST /suggestions/` as `FormData`; calls `suggestionSent()`. Shows "Мои предложения" (last 5) with status badges |

### AI chat — `AssistantChat.jsx`
- Round button in the corner; panel with message list and input.
- `GET /assistant/` on start → hides itself if not `enabled`.
- History in `sessionStorage["assistant-chat"]` (survives page changes and reloads in the tab).
- Suggested starter questions (`SUGGESTIONS`), `Thinking` animated dots while waiting.
- `POST /assistant/ {messages}`; error codes mapped by `ERRORS` (`not_configured`, `busy`, `unavailable`, `too_long`).
- `Answer` renders a small Markdown subset: paragraphs, `- ` / `1. ` lists; `Inline` renders `**bold**` and
  `[text](/places/5)` / `[text](/lists/3)` as router `Link`s (only internal links). On phones following a link
  closes the chat.

### 3D (CesiumJS)
| File | Exports | What it does |
|---|---|---|
| `cesium.js` | `createViewer(container)`, `CATEGORY_COLORS`, `iconFontReady()`, `placeMarker(color, icon, label)` | Shared setup: `CESIUM_BASE_URL = "/cesium/"`; viewer with Cesium World Terrain + Bing Aerial (ion), no default widgets; sun fixed to a summer noon in Tajikistan; quality settings (resolution scale, FXAA, atmosphere, terrain detail) with lighter settings on phones (`PHONE` = coarse pointer or width < 768); category colours; canvas-drawn round markers with a Material icon or a number, ring, pointer and shadow |
| `RouteMap3D.jsx` | default | Route map: numbered pins (green if visited), click → `onSelect`, road polyline from `path` (or dashed straight line), camera fits all points |
| `home/PlacesMap3D.jsx` | default | All places on a spinning globe (see below) |
| `place/Terrain3D.jsx` | default | One place's terrain with an orbiting camera (see below) |

---

## `components/home/` — sections of the home page

| File | What it does |
|---|---|
| `Hero.jsx` | Full-screen slider of 10 Wikimedia photos (author credits shown). Crossfade 1.8 s + slow Ken-Burns zoom towards different points, next slide every 6 s, clickable progress dots, only current/previous/next photos loaded, phones use `/hero/small/`. Heading animated letter by letter (grouped by word so lines wrap correctly). Buttons: explore places, **places near me** (`onNearby`), scroll hint |
| `PlacesSection.jsx` | Filters (region, category, season, sort `ORDERING`, "only free"), reset, grid of `PlaceCard`s, "show more" pagination (`buildQuery(filters, page)` → `GET /places/?…`), reloads when filters or the user change. In nearby mode shows `nearby.places` with distances |
| `MapSection.jsx` | `#map` section: a button that lazy-loads `PlacesMap3D` with `React.lazy` + `Suspense` (the big Cesium library is downloaded only on demand) |
| `PlacesMap3D.jsx` | `GET /places/?page_size=100`; starts as the Earth seen from space slowly spinning west→east (`SPIN_SPEED`); "Tajikistan" glowing label (click → fly to the country); category pins visible only within 3500 km (`DistanceDisplayCondition`), names appear when close; place search box; choosing a place stops the spin and flies down to it, showing a card; "back to space" restarts the spin |
| `CategoriesSection.jsx` | `#categories`: tiles with `categoryStyle()` gradients/icons and descriptions; click → filter places by that category |
| `InfoSection.jsx` | `#info`: travel `TIPS` (when to go, transport, …) and a "suggest a place" call to action |
| `ListsSection.jsx` | `#lists`: `GET /travel-lists/public/?page_size=3`; `TravelListCard` (title, number of places, author, stop names, link to `/lists/:id`, "copy to me"); the middle card of three is highlighted |

## `components/place/` — place page blocks

| File | Exports | What it does |
|---|---|---|
| `PlaceGallery.jsx` | default | Big photo (`image_medium`) + 3 tiles (more photos, else similar places); full-screen original on click |
| `PlaceInfoBlocks.jsx` | `MetricsBar`, `LocationCard`, `DetailsAccordion`, `GoodToKnow`, `GearChecklist` | Metrics row (season, altitude, fee, region, category, views); OSM `iframe` map + altitude scale from Dushanbe (800 m) to Ismoil Somoni Peak (7495 m); accordion (description, how to get there, activities, address); "what's there / keep in mind" generated from fields (fee, altitude, season, activities); packing checklist (`GEAR`, clothes depend on winter or not) |
| `PlaceSidebar.jsx` | default | Price, favourite button, "open in OpenStreetMap", share (copy link) |
| `Reviews.jsx` | default `Reviews({placeId, onSummary})` | `GET /places/{id}/reviews/?page_size=20`; rating summary bars 5→1; list with photos (`image_small`); delete own (or as moderator); `ReviewForm` — stars, comment, up to 5 photos with previews (object URLs revoked), `POST /reviews/` as `FormData` |
| `Terrain3D.jsx` | default | Cesium viewer; marker with category colour/icon; start distance depends on mountain vs city (`startView`); orbits at 5°/s (`DEGREES_PER_SECOND`); samples real terrain height (falls back to DB altitude); loading text hidden when tiles are almost loaded or after 10 s |
| `WeatherCard.jsx` | default | Open-Meteo forecast for lat/lng/**elevation**; WMO code → text + icon (`CODES`, `describe()`); current temperature, feels-like, humidity, wind (m/s), and daily max/min with precipitation probability with `Intl.DateTimeFormat` |

## `components/profile/` — profile page blocks

| File | Exports | What it does |
|---|---|---|
| `ProfileHeader.jsx` | default, `Avatar` | Avatar (image or initial), name, join date, @username, role, counters (routes, reviews), `InfoTile`s (favourites, suggestions, contacts) |
| `RouteCard.jsx` | default | User's routes: selector, `NewRouteForm` (from → to, from site places; title "A → B"), stops with visited toggle & remove, add stop (inserted before the destination by bumping its `order`), public/private toggle, open route page, delete. `run()` helper = API call + reload + stats refresh + toast |
| `FavoritesCard.jsx` | default | `GET /favorites/?page_size=50`, reloads on `favoritesVersion` |
| `ReviewsCard.jsx` | default | `GET /reviews/my/?page_size=50`, delete with confirm |
| `SettingsCard.jsx` | default `SettingsCard`, `SuggestionsCard` | Settings: profile form (`PATCH /auth/profile/`, empty phone sent as `null` because it's unique), change password, "forgot current password" sends a reset link to the profile email. `SuggestionsCard`: `GET /suggestions/?page_size=20`, reloads on `suggestionsVersion`, status badges + admin comment |

## `components/admin/` — admin panel tabs

| File | What it does |
|---|---|
| `ui.jsx` | Shared class strings (`card`, `input`, `btnPrimary`, `btnSecondary`, `btnDanger`) and `Empty` |
| `StatsTab.jsx` | `GET /stats/`: counter tiles (`COUNTERS`), pending suggestions with a button to that tab, places by region bars, top 5 places |
| `SuggestionsTab.jsx` | Status filter (`FILTERS`: pending/approved/rejected), `GET /suggestions/?status=&page_size=50`; `SuggestionCard` shows author, photo, map coordinates, choose region/category, comment → `POST …/approve/` or `…/reject/` (reason required) |
| `PlacesTab.jsx` | Search + list of places (`GET /places/?…` incl. hidden), hide/show (`PATCH is_active`), delete, edit/create with `PlaceEditor` (all fields incl. `name_en`/`name_tg`, region, category, activities, coordinates, altitude, season, fee) and `PhotosManager` (upload `POST /place-images/`, set main, delete) |
| `UsersTab.jsx` | `GET /auth/users/?page_size=100&search=`; change role (user/moderator/admin), block/unblock (`PATCH /auth/users/{id}/`); marks "(это вы)" |
| `ReviewsTab.jsx` | `GET /reviews/?page_size=100&ordering=-created_at&rating=` (filter by stars); delete inappropriate reviews |
