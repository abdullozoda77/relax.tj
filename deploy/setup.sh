#!/usr/bin/env bash
# Installs Rohat on the server, or brings an installed copy up to date; safe to run again.
# Run as root after cloning the project to /home/romin/rohat:
#   bash /home/romin/rohat/deploy/setup.sh
#
# What runs where:  nginx https://rohat.khayrkhoh.tj and http://IP:8030  →  React site (frontend/dist), /media, /static
#                                →  /api /admin /swagger  →  gunicorn 127.0.0.1:8031 (Django)
#                   certbot (Let's Encrypt) keeps the HTTPS certificate renewed
#                   Celery worker + beat  ←→  Redis (database 12)
# Other projects on this server are not touched: own port, own services, Node.js only for this user.
set -euo pipefail

APP_USER=romin
APP=/home/$APP_USER/rohat
PUBLIC_PORT=8030
DOMAIN=rohat.khayrkhoh.tj  # must point to this server in DNS
REDIS_DB=12
NODE_DIR=/home/$APP_USER/.local/node22
SERVER_IP=$(hostname -I | awk '{print $1}')

step() { echo; echo "==> $*"; }

# Sets one KEY=value line in .env (adds it if missing); other lines, keys and passwords stay as they are.
set_env() {
  python3 - "$APP/.env" "$1" "$2" <<'PY'
import sys
path, key, value = sys.argv[1:]
lines = open(path).read().splitlines()
for i, line in enumerate(lines):
    if line.startswith(key + "="):
        lines[i] = f"{key}={value}"
        break
else:
    lines.append(f"{key}={value}")
open(path, "w").write("\n".join(lines) + "\n")
PY
}
as_user() { sudo -u "$APP_USER" -H bash -c "cd '$APP' && $*"; }

[ "$(id -u)" = 0 ] || { echo "Run this script as root."; exit 1; }
[ -d "$APP/.git" ] || { echo "Clone the project to $APP first."; exit 1; }

# The public port must be free, or already Rohat's.
if ss -ltn "sport = :$PUBLIC_PORT" | grep -q LISTEN && [ ! -e /etc/nginx/sites-enabled/rohat ]; then
  echo "Port $PUBLIC_PORT is used by another program. Change PUBLIC_PORT in this script."
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
# Addresses of the site (the domain and the old IP address); HTTPS and FRONTEND_URL are set in the nginx step.
set_env ALLOWED_HOSTS "$DOMAIN,$SERVER_IP,localhost,127.0.0.1"
set_env CSRF_TRUSTED_ORIGINS "https://$DOMAIN,http://$DOMAIN,http://$SERVER_IP:$PUBLIC_PORT"
set_env CORS_ALLOWED_ORIGINS "https://$DOMAIN,http://$DOMAIN,http://$SERVER_IP:$PUBLIC_PORT"
chown "$APP_USER:$APP_USER" "$APP/.env"
chmod 600 "$APP/.env"  # keys and passwords: readable only by $APP_USER

step "Database, admin styles and the places"
as_user ".venv/bin/python manage.py migrate --noinput"
as_user ".venv/bin/python manage.py collectstatic --noinput -v 0"
as_user ".venv/bin/python manage.py seed"
as_user ".venv/bin/python manage.py make_thumbnails"  # small photo copies for cards and phones

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

step "nginx and HTTPS for $DOMAIN"
install -m 644 "$APP/deploy/nginx-rohat-site.conf" /etc/nginx/snippets/rohat-site.conf
mkdir -p /var/www/certbot
CERT_DIR=/etc/letsencrypt/live/$DOMAIN

# Writes Rohat's nginx config: "http" before there is a certificate, "https" after. Only Rohat's names and port.
write_nginx() {
  if [ "$1" = https ]; then
    cat > /etc/nginx/sites-available/rohat <<NGINX
# Rohat: generated by deploy/setup.sh, do not edit here (changes are lost on the next update).
server {
    listen 80;
    server_name $DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://\$host\$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    ssl_certificate $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:rohat_ssl:10m;
    include snippets/rohat-site.conf;
}

# The IP address keeps working on its own too (the site does not depend on the domain's DNS).
server {
    listen $PUBLIC_PORT;
    server_name _;
    include snippets/rohat-site.conf;
}
NGINX
  else
    cat > /etc/nginx/sites-available/rohat <<NGINX
# Rohat: generated by deploy/setup.sh (no HTTPS certificate yet).
server {
    listen 80;
    server_name $DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    include snippets/rohat-site.conf;
}

server {
    listen $PUBLIC_PORT;
    server_name _;
    include snippets/rohat-site.conf;
}
NGINX
  fi
  ln -sf /etc/nginx/sites-available/rohat /etc/nginx/sites-enabled/rohat
  if nginx -t 2>&1; then
    systemctl reload nginx
  else
    rm -f /etc/nginx/sites-enabled/rohat
    echo "nginx found an error in the Rohat config; Rohat is switched off in nginx, other sites are not affected."
    exit 1
  fi
}

if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp; ufw allow 443/tcp; ufw allow "$PUBLIC_PORT/tcp"
fi

if [ -f "$CERT_DIR/fullchain.pem" ]; then
  write_nginx https
else
  write_nginx http
  command -v certbot >/dev/null || { apt-get update -qq && apt-get install -y -qq certbot; }
  echo
  echo "Getting a free HTTPS certificate for $DOMAIN from Let's Encrypt."
  echo "certbot asks for your email (for expiry warnings) and to accept the Let's Encrypt terms."
  if certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" --deploy-hook "systemctl reload nginx"; then
    write_nginx https
  else
    echo "No certificate yet: the site works on http://$DOMAIN. Check that $DOMAIN points to $SERVER_IP, then run this script again."
  fi
fi

if [ -f "$CERT_DIR/fullchain.pem" ]; then
  SITE_URL=https://$DOMAIN
  set_env HTTPS True
else
  SITE_URL=http://$DOMAIN
  set_env HTTPS False
fi
set_env FRONTEND_URL "$SITE_URL"  # links in emails (password reset)

step "Services: gunicorn, Celery worker, Celery beat"
cp "$APP"/deploy/rohat-gunicorn.service "$APP"/deploy/rohat-celery.service "$APP"/deploy/rohat-celerybeat.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable -q rohat-gunicorn rohat-celery rohat-celerybeat
systemctl restart rohat-gunicorn rohat-celery rohat-celerybeat

step "Check"
sleep 3
systemctl is-active rohat-gunicorn rohat-celery rohat-celerybeat
curl -sS -o /dev/null -w "site: HTTP %{http_code}\n" "$SITE_URL/"
curl -sS -o /dev/null -w "API:  HTTP %{http_code}\n" "$SITE_URL/api/places/?page_size=1"

echo
echo "Rohat: $SITE_URL/"
echo "Admin account:   cd $APP && sudo -u $APP_USER .venv/bin/python manage.py createsuperuser"
echo "Email / AI keys: nano $APP/.env   then   systemctl restart rohat-gunicorn rohat-celery"
echo "Logs:            journalctl -u rohat-gunicorn -u rohat-celery -f"
