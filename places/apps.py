from django.apps import AppConfig


class PlacesConfig(AppConfig):
    name = 'places'

    def ready(self):
        from . import signals  # noqa: F401  connects the signal handlers
