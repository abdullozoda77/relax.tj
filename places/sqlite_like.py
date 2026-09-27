"""Case-insensitive search for every alphabet in SQLite.

SQLite's LIKE ignores letter case only for Latin letters, so searching "искан" did not find
"Искандеркуль". Django's icontains / contains / startswith use LIKE, so replacing SQLite's like()
with one that ignores case for all letters fixes search in Russian and Tajik everywhere.
"""
import re
from functools import lru_cache

from django.db.backends.signals import connection_created
from django.dispatch import receiver


@lru_cache(maxsize=512)
def like_regex(pattern, escape):
    """Turns a LIKE pattern (% = any text, _ = one character) into a regular expression."""
    parts, i = [], 0
    while i < len(pattern):
        char = pattern[i]
        if escape and char == escape and i + 1 < len(pattern):
            parts.append(re.escape(pattern[i + 1]))
            i += 2
            continue
        parts.append(".*" if char == "%" else "." if char == "_" else re.escape(char))
        i += 1
    return re.compile("".join(parts), re.IGNORECASE | re.DOTALL)


def like(pattern, value, escape=None):
    # SQLite calls like(pattern, value[, escape]) for "value LIKE pattern [ESCAPE escape]".
    if pattern is None or value is None:
        return None
    return like_regex(pattern, escape).fullmatch(str(value)) is not None


@receiver(connection_created)
def use_unicode_like(sender, connection, **kwargs):
    if connection.vendor == "sqlite":
        connection.connection.create_function("like", 2, like, deterministic=True)
        connection.connection.create_function("like", 3, like, deterministic=True)
