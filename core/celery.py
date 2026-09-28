"""Celery: background tasks (sending emails) and scheduled ones (nightly cleanup).

The broker is Redis, set with CELERY_BROKER_URL in .env. Without it (local development) tasks are not
queued: emails are sent right away, as before.
"""
import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

app = Celery("rohat")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
