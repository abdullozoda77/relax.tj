#!/usr/bin/env bash
# Installs Rohat on the server, or brings an installed copy up to date; safe to run again.
# Run as root after cloning the project to /home/romin/rohat:
#   bash /home/romin/rohat/deploy/setup.sh
#
# What runs where:  nginx :8030  →  React site (frontend/dist), /media, /static
#                                →  /api /admin /swagger  →  gunicorn 127.0.0.1:8031 (Django)
#                   Celery worker + beat  ←→  Redis (database 12)
# Other projects on this server are not touched: own port, own services, Node.js only for this user.
set -euo pipefail

APP_USER=romin
APP=/home/$APP_USER/rohat
PUBLIC_PORT=8030
REDIS_DB=12
NODE_DIR=/home/$APP_USER/.local/node22
SERVER_IP=$(hostname -I | awk '{print $1}')

step() { echo; echo "==> $*"; }
as_user() { sudo -u "$APP_USER" -H bash -c "cd '$APP' && $*"; }

[ "$(id -u)" = 0 ] || { echo "Run this script as root."; exit 1; }
[ -d "$APP/.git" ] || { echo "Clone the project to $APP first."; exit 1; }

# The public port must be free, or already Rohat's.
if ss -ltn "sport = :$PUBLIC_PORT" | grep -q LISTEN && [ ! -e /etc/nginx/sites-enabled/rohat ]; then
  echo "Port $PUBLIC_PORT is used by another program. Change PUBLIC_PORT here and in deploy/nginx-rohat.conf."
  exit 1
fi

step "Python packages"
as_user "[ -d .venv ] || python3 -m venv .venv"
as_user ".venv/bin/pip install -q --upgrade pip"
as_user ".venv/bin/pip install -q -r requirements.txt"

step "Settings (.env)"
if [ ! -f "$APP/.env" ]; then
  secret=$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')
  cat > "$APP/.env" <<ENV
SECRET_KEY=$secret
DEBUG=False
ALLOWED_HOSTS=$SERVER_IP,localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=http://$SERVER_IP:$PUBLIC_PORT
CORS_ALLOWED_ORIGINS=http://$SERVER_IP:$PUBLIC_PORT
FRONTEND_URL=http://$SERVER_IP:$PUBLIC_PORT
CELERY_BROKER_URL=redis://127.0.0.1:6379/$REDIS_DB

# Emails (verification codes, password reset) through Gmail: the address and a 16-letter app password from
# https://myaccount.google.com/apppasswords. While these two are empty, codes are only written to the log.
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=

# AI assistant: a free key from https://aistudio.google.com/apikey (or a paid ANTHROPIC_API_KEY).
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
ENV
  echo "Created $APP/.env — add the email and AI keys to it later (see the end of this script)."
fi
chown "$APP_USER:$APP_USER" "$APP/.env"
chmod 600 "$APP/.env"  # keys and passwords: readable only by $APP_USER

step "Database, admin styles and the places"
as_user ".venv/bin/python manage.py migrate --noinput"
as_user ".venv/bin/python manage.py collectstatic --noinput -v 0"
as_user ".venv/bin/python manage.py seed"

step "Node.js 22 for $APP_USER (the system Node.js stays as it is)"
if [ ! -x "$NODE_DIR/bin/node" ]; then
  # The official build from nodejs.org, checked against its published SHA-256 sum.
  sudo -u "$APP_USER" -H env NODE_DIR="$NODE_DIR" bash -s <<'NODE'
set -euo pipefail
base=https://nodejs.org/dist/latest-v22.x
tmp=$(mktemp -d)
curl -fsSL "$base/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"
file=$(grep -oE 'node-v22\.[0-9.]+-linux-x64\.tar\.xz' "$tmp/SHASUMS256.txt" | head -1)
curl -fsSL "$base/$file" -o "$tmp/$file"
(cd "$tmp" && grep " $file\$" SHASUMS256.txt | sha256sum -c -)
mkdir -p "$NODE_DIR"
tar -xJf "$tmp/$file" -C "$NODE_DIR" --strip-components=1
rm -rf "$tmp"
NODE
fi
as_user "'$NODE_DIR/bin/node' --version"

step "Frontend build"
as_user "cd frontend && export PATH='$NODE_DIR/bin':\$PATH && npm ci --no-audit --no-fund --loglevel=error && npm run build"

step "Access for nginx (it reads the site, photos and styles; .env stays private)"
chmod o+x "/home/$APP_USER" "$APP" "$APP/frontend"
chmod -R o+rX "$APP/frontend/dist" "$APP/static" "$APP/media"

step "Services: gunicorn, Celery worker, Celery beat"
cp "$APP"/deploy/rohat-gunicorn.service "$APP"/deploy/rohat-celery.service "$APP"/deploy/rohat-celerybeat.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable -q rohat-gunicorn rohat-celery rohat-celerybeat
systemctl restart rohat-gunicorn rohat-celery rohat-celerybeat

step "nginx"
cp "$APP/deploy/nginx-rohat.conf" /etc/nginx/sites-available/rohat
ln -sf /etc/nginx/sites-available/rohat /etc/nginx/sites-enabled/rohat
if nginx -t 2>&1; then
  systemctl reload nginx
else
  rm -f /etc/nginx/sites-enabled/rohat
  echo "nginx found an error in the Rohat config; Rohat is switched off in nginx, other sites are not affected."
  exit 1
fi
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow "$PUBLIC_PORT/tcp"
fi

step "Check"
sleep 3
systemctl is-active rohat-gunicorn rohat-celery rohat-celerybeat
curl -sS -o /dev/null -w "site: HTTP %{http_code}\n" "http://127.0.0.1:$PUBLIC_PORT/"
curl -sS -o /dev/null -w "API:  HTTP %{http_code}\n" "http://127.0.0.1:$PUBLIC_PORT/api/places/?page_size=1"

echo
echo "Rohat: http://$SERVER_IP:$PUBLIC_PORT/"
echo "Admin account:   cd $APP && sudo -u $APP_USER .venv/bin/python manage.py createsuperuser"
echo "Email / AI keys: nano $APP/.env   then   systemctl restart rohat-gunicorn rohat-celery"
echo "Logs:            journalctl -u rohat-gunicorn -u rohat-celery -f"
