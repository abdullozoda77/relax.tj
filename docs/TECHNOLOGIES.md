# Technologies

## Backend (Python) — `requirements.txt`

| Package | Version | What it is used for |
|---|---|---|
| **Django** | 6.1.1 | Web framework: ORM, migrations, admin, auth, email (`MAILERS`), cache, signals |
| **djangorestframework** (DRF) | 3.18.1 | REST API: serializers, ViewSets, routers, permissions, throttling, pagination |
| **djangorestframework_simplejwt** | 5.5.1 | JWT auth: access (60 min) / refresh (7 days) tokens, rotation, blacklist app |
| PyJWT | 2.15.0 | Low-level JWT encoding (dependency of SimpleJWT) |
| **django-filter** | 26.1 | `FilterSet`s for query-string filtering (`?region=&min_fee=…`) |
| **drf-yasg** | 1.21.15 | Auto-generated OpenAPI 2 docs: Swagger UI `/swagger/`, ReDoc `/redoc/` |
| inflection, uritemplate, PyYAML, packaging | — | drf-yasg dependencies |
| **django-cors-headers** | 4.9.0 | CORS headers for allowed frontend origins |
| **pillow** | 12.3.0 | `ImageField` support and WebP thumbnail generation (`places/thumbnails.py`) |
| **python-dotenv** | 1.2.3 | Loads `.env` into environment variables in `settings.py` |
| **celery[redis]** | 5.6.3 | Background tasks (emails with retries) and scheduled tasks (Celery beat, nightly cleanup) |
| **gunicorn** | 26.2.0 | Production WSGI server (gthread workers) |
| **google-genai** | 2.25.0 | Google Gemini SDK — default AI assistant provider (has a free tier) |
| **anthropic** | 1.8.0 | Anthropic Claude SDK — alternative AI provider |
| asgiref, sqlparse, pytz, tzdata | — | Django dependencies / time zones |

Standard library modules worth knowing: `urllib.request` (calls to OSRM and Nominatim), `secrets` (email codes),
`math` (haversine distance, Douglas–Peucker line simplification), `re` + `functools.lru_cache` (custom SQLite LIKE).

### Infrastructure / services

| Thing | Where | Why |
|---|---|---|
| **SQLite** | `db.sqlite3` | The database (dev and production) |
| **Redis** | server, database 12 | Celery broker (`CELERY_BROKER_URL=redis://127.0.0.1:6379/12`) |
| **nginx** | server | Serves the React build, media, static, Cesium files; reverse proxy to gunicorn; gzip; HTTPS |
| **certbot / Let's Encrypt** | server | Free HTTPS certificate for `rohat.king.tj`, auto-renewal |
| **systemd** | server | Runs `rohat-gunicorn`, `rohat-celery`, `rohat-celerybeat` services |
| **Gmail SMTP** | external | Sending confirmation codes and password reset links (app password) |
| **OSRM** (routing.openstreetmap.de, FOSSGIS) | external, no key | Road routes by car / foot / bike (`/api/route/`) |
| **Nominatim** (OpenStreetMap) | external, no key | Reverse geocoding: is a point really inside Tajikistan? |
| **Google Gemini API** | external, key | AI assistant (models `gemini-3.8-flash` + fallbacks) |
| **Anthropic API** | external, key | AI assistant alternative (`claude-opus-5`, adaptive thinking, prompt caching) |

## Frontend (JavaScript) — `frontend/package.json`

### Runtime dependencies

| Package | Version | What it is used for |
|---|---|---|
| **react**, **react-dom** | ^19.2 | UI library (function components + hooks, `lazy`, `Suspense`, `StrictMode`) |
| **react-router-dom** | ^7.18 | Client-side routing (`BrowserRouter`, `Routes`, `Link`, `useParams`, `useSearchParams`, `useNavigate`) |
| **cesium** | ^1.145 | CesiumJS 3D globe: place terrain view, route map, map of all places (Cesium World Terrain + Bing Aerial via Cesium ion demo token) |
| **leaflet** | ^1.9.4 | 2D OpenStreetMap map to pick a location when suggesting a place |

### Dev dependencies

| Package | Version | What it is used for |
|---|---|---|
| **vite** | ^8.3 | Dev server with HMR, `/api` proxy, production build |
| **@vitejs/plugin-react** | ^6.1 | JSX transform + Fast Refresh |
| **tailwindcss** | ^3.4 | Utility-first CSS; colours from CSS variables for dark/light themes |
| **@tailwindcss/forms** | ^0.5 | Nicer default form controls |
| **postcss**, **autoprefixer** | — | CSS pipeline for Tailwind |
| **concurrently** | ^10 | `npm run dev` runs Django and Vite together |
| **oxlint** | ^1.81 | Fast linter (`npm run lint`), React hooks rules |
| @types/react, @types/react-dom | — | Editor type hints |

### Browser-side external services

| Service | Used in | Why |
|---|---|---|
| **Open-Meteo** (`api.open-meteo.com`) | `WeatherCard.jsx` | Current weather + forecast for the place's coordinates and real altitude (no key) |
| **OpenStreetMap tiles / embed** | `LocationPicker.jsx`, `PlaceInfoBlocks.jsx`, `PlaceSidebar.jsx` | 2D maps and "open in OSM" links |
| **Google Maps directions URL** | `utils.js → googleMapsUrl()` | "Open in Google Maps" for a route (no API, just a link) |
| **Cesium ion** | `components/cesium.js` | Terrain and satellite imagery for 3D views |
| **Google Fonts** | `index.html` | Inter, Manrope, JetBrains Mono, Material Symbols Outlined (icons) |
| **Browser Geolocation API** | `Home.jsx`, `LocationPicker.jsx` | "Places near me", "use my location" |
| **IntersectionObserver** | `Reveal.jsx`, `WhenVisible.jsx` | Scroll animations, lazy mounting of 3D maps |

## Languages, formats, conventions

- **Python 3** (venv in `.venv/`), **JavaScript (ES modules, JSX)**, Bash (deploy scripts), nginx config, systemd units.
- Interface languages: **Russian** (base), **Tajik** (Cyrillic), **English**.
- Data language: the database is Russian; places additionally have `name_en` / `name_tg`.
- Time zone `Asia/Dushanbe`, `LANGUAGE_CODE = 'ru'`, money in **somoni** (TJS).
- Images: jpg, jpeg, png, webp, max 5 MB; thumbnails saved as WebP (quality 78).
