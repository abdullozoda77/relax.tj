# Deploying Rohat

```
Browser ──► nginx :8030 ──► frontend/dist (React), /media, /static
                   └──────► /api /admin /swagger ──► gunicorn 127.0.0.1:8031 (Django)
Django ──► Redis (db 12) ──► Celery worker (emails)   ◄── Celery beat (nightly cleanup 03:30)
```

First install (as root on the server):

```bash
sudo -u romin git clone https://github.com/abdullozoda77/relax.tj.git /home/romin/rohat
bash /home/romin/rohat/deploy/setup.sh
cd /home/romin/rohat && sudo -u romin .venv/bin/python manage.py createsuperuser
```

Keys (Gmail app password, Gemini): `nano /home/romin/rohat/.env`, then `systemctl restart rohat-gunicorn rohat-celery`.

Update after new commits on GitHub: `bash /home/romin/rohat/deploy/update.sh`.

Logs: `journalctl -u rohat-gunicorn -u rohat-celery -u rohat-celerybeat -f`.
