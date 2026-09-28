# Deploying Rohat

```
Browser ──► nginx https://rohat.khayrkhoh.tj ──► frontend/dist (React), /media, /static
            (http:// and :8030 redirect here) └► /api /admin /swagger ──► gunicorn 127.0.0.1:8031 (Django)
Django ──► Redis (db 12) ──► Celery worker (emails)   ◄── Celery beat (nightly cleanup 03:30)
certbot (Let's Encrypt) renews the HTTPS certificate by itself.
```

First install (as root on the server):

```bash
sudo -u romin git clone https://github.com/abdullozoda77/relax.tj.git /home/romin/rohat
bash /home/romin/rohat/deploy/setup.sh
cd /home/romin/rohat && sudo -u romin .venv/bin/python manage.py createsuperuser
```

The first run asks certbot for the certificate: enter your email and accept the Let's Encrypt terms.
The domain (DOMAIN in setup.sh) must point to the server in DNS first.

Keys (Gmail app password, Gemini): `nano /home/romin/rohat/.env`, then `systemctl restart rohat-gunicorn rohat-celery`.

Update after new commits on GitHub: `bash /home/romin/rohat/deploy/update.sh`.

Logs: `journalctl -u rohat-gunicorn -u rohat-celery -u rohat-celerybeat -f`.
