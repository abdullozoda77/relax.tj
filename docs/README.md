# Rohat — Full Project Documentation

Rohat (Tajik: *rest, relaxation*) is a website for finding places to rest and travel in **Tajikistan**:
regions, categories, places with photos, reviews with photos, favourites, travel routes with road navigation,
3D maps, weather, notifications, user suggestions of new places, an admin/moderator panel and an AI assistant.

- **Live:** https://rohat.king.tj (also `http://31.25.238.204:8030`)
- **Backend:** Django 6.1 + Django REST Framework (JWT), Celery + Redis, SQLite
- **Frontend:** React 19 + Vite 8 + Tailwind CSS 3 + React Router 7, CesiumJS (3D) and Leaflet (2D map)

> These docs describe the code as committed on the `hero-animations-globe-translations` branch (HEAD).

## How to read these docs

| File | What it covers |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | The big picture: layers, request flow, design patterns, how frontend and backend talk |
| [TECHNOLOGIES.md](TECHNOLOGIES.md) | Every library / service used, its version and *why* it is used |
| [FEATURES.md](FEATURES.md) | Every feature of the site, end to end (which page → which API → which model) |
| **Backend** | |
| [backend/core.md](backend/core.md) | `core/` — settings, URLs, Celery, WSGI/ASGI, `manage.py`, `.env` |
| [backend/accounts.md](backend/accounts.md) | `accounts/` — custom user, roles, registration, email codes, JWT, password reset |
| [backend/places.md](backend/places.md) | `places/` — models, serializers, views, filters, permissions, signals, thumbnails, geo, routing, seed |
| [backend/assistant.md](backend/assistant.md) | `assistant/` — AI chat (Gemini / Claude), system prompt, tool calling |
| [backend/database.md](backend/database.md) | All tables, fields, relations, constraints, migrations (ER diagram) |
| [backend/api-reference.md](backend/api-reference.md) | Every API endpoint: method, URL, permission, body, response |
| [backend/testing.md](backend/testing.md) | The test suites and how to run them |
| **Frontend** | |
| [frontend/overview.md](frontend/overview.md) | Build setup, entry point, routing, `api.js`, i18n, contexts, styling/theming |
| [frontend/pages.md](frontend/pages.md) | Every page in `src/pages/` |
| [frontend/components.md](frontend/components.md) | Every component in `src/components/` (shared, home, place, profile, admin, 3D) |
| **Operations** | |
| [deploy.md](deploy.md) | Server deployment: nginx, gunicorn, Celery, Redis, certbot, systemd scripts |

## Folder tree

```
exam3/
├── manage.py                 Django command-line entry point
├── requirements.txt          Python dependencies (pinned)
├── .env.example              Template for environment variables (.env is git-ignored)
├── README.md                 Short Russian readme (quick start + endpoint list)
├── core/                     Django project: settings, root URLs, Celery app, WSGI/ASGI
├── accounts/                 App: users, roles, auth (JWT), email confirmation, password reset, Celery tasks
│   └── migrations/           0001…0005
├── places/                   App: the whole travel catalogue (places, reviews, favourites, routes, …)
│   ├── management/commands/  seed, make_thumbnails (+ data files _details.py, _new_places.py)
│   ├── migrations/           0001…0007
│   └── seed_photos/          Photos used by `seed` (+ CREDITS.md with authors/licences)
├── assistant/                App: AI assistant endpoint (no models)
├── deploy/                   Server scripts: setup.sh, update.sh, nginx snippet, systemd units
├── media/                    Uploaded files (git-ignored): places/, reviews/, avatars/, suggestions/, thumbs/
├── db.sqlite3                SQLite database (git-ignored)
├── docs/                     ← this documentation
└── frontend/                 React single-page app
    ├── index.html            HTML shell (fonts, theme bootstrap script)
    ├── package.json          npm scripts and dependencies
    ├── vite.config.js        Vite: React plugin, /api proxy, Cesium static files
    ├── tailwind.config.js    Tailwind: colours from CSS variables (dark/light theme), fonts, sizes
    ├── postcss.config.js     Tailwind + autoprefixer
    ├── .oxlintrc.json        Linter rules (oxlint)
    ├── scripts/django.mjs    Starts Django from npm (`npm run dev`)
    ├── public/               Static files: brand/ (logo, favicons), hero/ (slider photos + small/)
    └── src/
        ├── main.jsx          React entry: StrictMode + BrowserRouter
        ├── App.jsx           Providers, header/footer, routes, AI chat
        ├── api.js            fetch wrapper: JWT, auto refresh, error translation
        ├── i18n.js           t() translation function, language switching
        ├── translations.js   EN and TG translations (key = Russian text)
        ├── roles.js          isAdmin / isModerator helpers
        ├── utils.js          Seasons, category styles, formatting, distance, Google Maps links
        ├── index.css         Theme colours (CSS variables), glass effect, animations
        ├── context/          AuthContext, UiContext, ToastContext
        ├── pages/            Home, PlaceDetail, TravelListPage, Profile, AdminPanel, ResetPassword
        └── components/       Shared UI + home/, place/, profile/, admin/ folders + 3D maps
```

## Quick start (development)

```bash
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed                # 5 regions, 9 categories, 7 activities, ~89 places, photos, 5 routes
python manage.py createsuperuser
cd frontend && npm install && npm run dev   # Django :8000 + React :5173 in one terminal
```

Open http://localhost:5173. Swagger UI: http://127.0.0.1:8000/swagger/ · ReDoc: `/redoc/` · Django admin: `/admin/`.

In development without SMTP settings, emails (confirmation codes, reset links) are printed to the Django console
as `[email code] …` and `[password reset] …`. Without `CELERY_BROKER_URL`, Celery tasks run inline.
