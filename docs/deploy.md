# Deployment (`deploy/`)

Production runs on one Ubuntu server next to other projects, under user **`romin`**, from
`/home/romin/rohat` (a git clone of the GitHub repo).

```
Browser ──► nginx https://rohat.king.tj  (and http://<server-ip>:8030)
              ├─ /                → frontend/dist (React build, index.html fallback for client routes)
              ├─ /assets/         → hashed JS/CSS, cached 1 year
              ├─ /hero/ /brand/   → slider photos and logo, cached 30 days
              ├─ /cesium/         → Cesium workers/assets, cached 30 days
              ├─ /media/          → uploads + thumbnails, cached 7 days
              ├─ /static/         → Django admin/Swagger static files, cached 30 days
              └─ /api /admin /swagger /redoc → gunicorn 127.0.0.1:8031 (Django)
Django ──► Redis db 12 ──► Celery worker (emails)    ◄── Celery beat (cleanup at 03:30)
certbot (Let's Encrypt) renews the HTTPS certificate automatically.
```

## Files

| File | Purpose |
|---|---|
| `deploy/README.md` | Short instructions (first install, keys, update, logs) |
| `deploy/setup.sh` | Installs or updates everything; safe to re-run (idempotent) |
| `deploy/update.sh` | `git pull --ff-only` as `romin`, then runs `setup.sh` |
| `deploy/nginx-rohat-site.conf` | nginx snippet shared by all Rohat server blocks (installed to `/etc/nginx/snippets/rohat-site.conf`) |
| `deploy/rohat-gunicorn.service` | systemd unit: `gunicorn core.wsgi:application --bind 127.0.0.1:8031 --workers 3 --threads 4 --timeout 120` (gthread so a slow AI answer doesn't block others) |
| `deploy/rohat-celery.service` | systemd unit: `celery -A core worker --concurrency=2` |
| `deploy/rohat-celerybeat.service` | systemd unit: `celery -A core beat --schedule=/home/romin/rohat/.celerybeat-schedule` |

## `setup.sh` step by step

Variables: `APP_USER=romin`, `APP=/home/romin/rohat`, `PUBLIC_PORT=8030`, `DOMAIN=rohat.king.tj`, `REDIS_DB=12`,
`NODE_DIR=/home/romin/.local/node22`.

1. Checks: must run as root, the repo must exist, port 8030 must be free (or already Rohat's).
2. **Python packages** — creates `.venv` if missing, upgrades pip, installs `requirements.txt`.
3. **`.env`** — on first run generates `SECRET_KEY`, `DEBUG=False`, `CELERY_BROKER_URL=redis://127.0.0.1:6379/12`,
   Gmail SMTP placeholders, AI key placeholders. Every run updates `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`,
   `CORS_ALLOWED_ORIGINS` via `set_env` (a small Python helper that edits one `KEY=value` line). `chmod 600`.
4. **Database** — `migrate`, `collectstatic`, `seed`, `make_thumbnails`.
5. **Node.js 22** — downloaded from nodejs.org for `romin` only (verified with SHA-256), system Node untouched.
6. **Frontend build** — `npm ci && npm run build` in `frontend/`.
7. **Permissions** — nginx can read `frontend/dist`, `static`, `media` (not `.env`).
8. **nginx + HTTPS** — installs the snippet; `write_nginx http|https` writes `/etc/nginx/sites-available/rohat`:
   - HTTPS mode: port 80 → redirect to https (except ACME challenge), port 443 with the Let's Encrypt certificate
     (TLS 1.2/1.3, http2), and port 8030 serving the site directly by IP.
   - HTTP mode (no certificate yet): port 80 and port 8030.
   - Runs `nginx -t`; on error removes Rohat's site so other sites keep working.
   - Opens ufw ports 80, 443, 8030 if ufw is active.
   - If there is no certificate: installs certbot, runs `certbot certonly --webroot` with a reload hook.
   - Sets `HTTPS=True|False` and `FRONTEND_URL` in `.env`.
9. **Services** — copies the three unit files, `daemon-reload`, `enable`, `restart`.
10. **Check** — `systemctl is-active`, `curl` the site and `/api/places/` locally (`--resolve` so it works even if
    DNS is broken), warns if the domain doesn't resolve.

## nginx snippet highlights (`nginx-rohat-site.conf`)
- `client_max_body_size 20M` (photo uploads).
- `gzip` for CSS/JS/JSON/SVG (JS ~4.8 MB → ~1.3 MB).
- `root …/frontend/dist`; `location / { try_files $uri $uri/ /index.html; }` — SPA fallback.
- `location ~ ^/(api|admin|swagger|redoc)(/|$)` → `proxy_pass http://127.0.0.1:8031` with `Host`, `X-Real-IP`,
  `X-Forwarded-For`, `X-Forwarded-Proto` headers and `proxy_read_timeout 120s` (AI answers).

## Common commands

First install (as root):
```bash
sudo -u romin git clone https://github.com/abdullozoda77/relax.tj.git /home/romin/rohat
bash /home/romin/rohat/deploy/setup.sh
cd /home/romin/rohat && sudo -u romin .venv/bin/python manage.py createsuperuser
```

Update to the latest `main`:
```bash
bash /home/romin/rohat/deploy/update.sh
```

Add keys (Gmail app password, Gemini key), then restart:
```bash
nano /home/romin/rohat/.env
```
```bash
systemctl restart rohat-gunicorn rohat-celery
```

Logs:
```bash
journalctl -u rohat-gunicorn -u rohat-celery -u rohat-celerybeat -f
```
