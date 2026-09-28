# Celery starts with Django, so @shared_task functions use this app.
from .celery import app as celery_app

__all__ = ("celery_app",)
