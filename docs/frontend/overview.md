# Frontend overview (`frontend/`)

A React 19 single-page application built with Vite 8 and styled with Tailwind CSS 3.

## npm scripts (`package.json`)

| Script | Command | What it does |
|---|---|---|
| `npm run dev` | `concurrently -k -n django,react "npm:dev:django" "npm:dev:react"` | Starts Django (8000) **and** Vite (5173) in one terminal |
| `npm run dev:react` | `vite` | Only the React dev server |
| `npm run dev:django` | `node scripts/django.mjs` | Only Django (uses `.venv` Python if it exists; Windows/macOS/Linux) |
| `npm run build` | `vite build` | Production build to `dist/` (+ Cesium files copied to `dist/cesium`) |
| `npm run lint` | `oxlint` | Lint (`react/rules-of-hooks` = error, `only-export-components` = warn) |
| `npm run preview` | `vite preview` | Serve the built `dist/` |

## Config files

| File | Content |
|---|---|
| `index.html` | `<html class="dark">`, favicons from `/brand/`, a tiny inline script that adds `light` to `<html>` if `localStorage.theme === "light"` (before React → no flash), Google Fonts (Inter, Manrope, JetBrains Mono, Material Symbols Outlined), `<div id="root">` |
| `vite.config.js` | `@vitejs/plugin-react`; custom plugin **`cesiumStatic()`**: in dev serves `node_modules/cesium/Build/Cesium/*` at `/cesium/…` (path-traversal safe, correct MIME), on build copies `Workers`, `Assets`, `ThirdParty`, `Widgets` to `dist/cesium`; dev server port 5173 with proxy `/api` and `/media` → `http://127.0.0.1:8000` |
| `tailwind.config.js` | `darkMode: "class"`, content `index.html` + `src/**/*.{js,jsx}`; every colour (`white`, `slate-*`, `emerald-*`, `amber-*`, Material-style tokens `surface`, `surface-container-*`, `on-surface`, `primary`, `secondary`, `outline`…) is `rgb(var(--c-…) / <alpha-value>)`; custom font families and text sizes (`headline-lg`, `body-md`, `label-sm`, …); plugin `@tailwindcss/forms` |
| `postcss.config.js` | `tailwindcss` + `autoprefixer` |
| `.oxlintrc.json` | oxlint plugins `react`, `oxc` |
| `scripts/django.mjs` | `spawn(python, ["manage.py", "runserver", "8000"])` from the repo root |

## `public/`
- `brand/` — `logo.png/.webp`, `badge.webp`, `badge-32/64/128/180/512.png` (favicons, apple-touch-icon)
- `hero/` — 10 slider photos (1920 px) from Wikimedia Commons + `hero/small/` 960 px copies for phones

## Entry point

### `src/main.jsx`
Sets `document.title = t("Rohat — отдых в Таджикистане")` and renders
`<StrictMode><BrowserRouter><App/></BrowserRouter></StrictMode>` into `#root`. Imports `index.css`.

### `src/App.jsx`
- Provider order: `ToastProvider` → `AuthProvider` → `UiProvider` (Ui uses Auth and Toast).
- Layout: `Header`, `<main class="pt-20">`, `Footer`, `AssistantChat`.
- `ScrollToHash` — after navigation scrolls to `#hash` (50 ms delay so the section exists) or to the top.
- `PageTransition` — wraps routes in a `div key={pathname} className="page-enter"` so each new page fades in
  (hash-only changes do not replay it).
- Routes:

| Path | Page |
|---|---|
| `/` | `Home` |
| `/places/:id` | `PlaceDetail` |
| `/lists/:id` | `TravelListPage` |
| `/profile` | `Profile` |
| `/admin-panel` | `AdminPanel` (`?tab=`) |
| `/reset-password` | `ResetPassword` (`?uid=&token=`) |

---

## `src/api.js` — HTTP client

| Export | Purpose |
|---|---|
| `tokens` | getters `access`, `refresh` and `save()`, `clear()` over `localStorage` |
| `setLogoutHandler(fn)` | `AuthContext` registers `() => setUser(null)` here |
| `errorText(data)` | Turns DRF error bodies (`{detail}`, `{field: [msgs]}`, nested) into one string; known English server messages are translated through `SERVER_MESSAGES` → `t()` |
| `api(path, {method, body})` | The fetch wrapper used everywhere |

How `api()` works:
1. Prefixes `/api`; sends `Accept-Language: <lang>`; JSON-encodes objects, passes `FormData` as is (files).
2. Adds `Authorization: Bearer <access>` if logged in, remembering which token was sent.
3. On **401**:
   - another request already refreshed the token meanwhile → just resend;
   - else `refreshAccessToken()` — a **single shared promise** (`refreshing ??= …`), because refresh tokens rotate
     and can be used only once; parallel requests wait for the same refresh;
   - refresh failed → `tokens.clear()`, `onLogout()`, and resend **as a guest** so public data still loads.
4. `204` → `null`; otherwise parses JSON.
5. Not OK → throws `Error` with `.status` and `.data`; message is "Сессия истекла. Войдите снова." for 401 outside
   `/auth/`, otherwise `errorText(data)`.

## `src/i18n.js` and `src/translations.js` — languages

- `LANGS` = RU / TJ (`tg`) / EN.
- `lang` is read **once** from `localStorage.lang` at module load (many labels are built at import time), and set
  as `<html lang>`.
- `t(text, ...args)` → `translations[lang][text]` or the Russian text; `{0}`, `{1}` placeholders.
- `setLang(code)` saves and **reloads** the page.
- `locale()` → `ru-RU` / `tg-TJ` / `en-US` for `Intl` date/number formatting.
- `translations.js` (~1150 lines): `{ en: {...}, tg: {...} }`, key = Russian string from the code. Region / category /
  activity names from the DB are also translated with `t(name)`; place names come translated from the API.

## `src/roles.js`
`ROLES` labels; `isAdmin(user)` (role admin or `is_staff`), `isModerator(user)` (admin or moderator), `roleName(user)`.
Mirrors `places/permissions.py`.

## `src/utils.js`

| Export | Purpose |
|---|---|
| `SEASONS` | season code → translated label |
| `categoryStyle(name)` | `{icon, gradient, text}` per category (fallback "explore") — used for cards without photos and the categories section |
| `formatFee(fee)` | "N сомони" or "Бесплатно" |
| `formatRating(r)` | `4.3` or `—` |
| `formatDate(v)` | long localised date |
| `plural(n, [one, few, many])` | Russian 3 forms, English 2, Tajik singular |
| `distanceKm(...)` | haversine, same as backend |
| `formatDuration(min)` | "45 мин", "3 ч 29 мин", "1 д 5 ч" |
| `TRAVEL_MODES` | car / foot / bike: icon, label, Google travel mode, line colour |
| `TAJIKISTAN_BOX`, `inTajikistanBox()` | same box as `places/geo.py`, for a quick client-side hint |
| `googleMapsUrl(points, mode)` | Google Maps directions link with waypoints |

## Contexts (`src/context/`)

### `AuthContext.jsx` — `useAuth()`
State: `user`, `ready` (false while the saved token's profile is loading).
On start: registers the logout handler; if a token exists, loads `GET /auth/profile/` (on failure clears tokens).
Functions: `login(username, password)` (saves tokens, loads profile), `register(data)` (no tokens — email code
needed), `loginWithTokens(tokens)` (after email confirmation), `logout()` (blacklists refresh, clears),
`reloadUser`, `setUser`.

### `UiContext.jsx` — `useUi()`
- Modal manager: `MODALS = {auth: AuthModal, suggest: SuggestModal}`; `openAuth(tab)`, `openSuggest(name)`,
  `closeModal()`. Only one modal at a time.
- `openPlace(id)` → navigate to `/places/:id`.
- `requireLogin(message)` → true if logged in, otherwise toast + open login.
- Favourites: `favorites` overrides map, `isFavorite(place)`, `toggleFavorite(placeId, current)`
  (POST/DELETE `/places/{id}/favorite/`), `favoritesVersion` counter. Reset when the user changes.
- `suggestionsVersion` + `suggestionSent()`; `refreshMyData()` reloads the profile counters.

### `ToastContext.jsx` — `useToast()`
`toast(text, type = "ok" | "error")` shows one message at the bottom for 3.5 s.

## Styling (`src/index.css`)

- `@tailwind base/components/utilities`.
- `:root` — **dark theme** colour variables as RGB channels (so Tailwind opacity works: `bg-slate-900/80`).
- `html.light` — light theme overrides (the ☀/🌙 button toggles this class).
- `.material-symbols-outlined` icon font settings.
- Smaller Cesium credits (must stay visible by licence).
- `.liquid-glass`, `.liquid-glass-dark` — frosted glass panels (header over hero, hero buttons); light variant.
- `.hero-shadow` — readable white text over photos.
- Motion: `.reveal` / `.reveal-in` (scroll reveal), `.page-enter` (page fade), press effect on buttons,
  `.skeleton` (sweeping loading placeholder), `.scroll-hint` (mouse icon), `.slide-progress` (hero dots),
  `.fade-up`, and `prefers-reduced-motion` handling.

## Coding conventions
- Function components + hooks only; one default export per component file.
- All user-visible strings go through `t()`.
- Data fetching in `useEffect` with `api()`; errors shown with `toast(err.message, "error")`.
- Icons via `<Icon name="…" />` (Material Symbols).
- Heavy libs (Cesium) only behind `React.lazy` + `WhenVisible`.
