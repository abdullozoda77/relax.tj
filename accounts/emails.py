"""Email confirmation after registration: a 6-digit code sent by email (SMTP, see MAILERS in settings)."""
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail
from django.utils import timezone

from .models import EmailConfirmationCode

CODE_LIFETIME = timedelta(minutes=15)
MAX_ATTEMPTS = 5
RESEND_AFTER = timedelta(seconds=60)


def send_confirmation_code(user):
    """Makes a new code, saves its hash and emails the code. SMTP errors are raised to the caller."""
    code = f"{secrets.randbelow(10**6):06d}"
    EmailConfirmationCode.objects.update_or_create(
        user=user, defaults={"code_hash": make_password(code), "sent_at": timezone.now(), "attempts": 0}
    )
    minutes = int(CODE_LIFETIME.total_seconds() // 60)
    send_mail(
        subject="Rohat — код подтверждения",
        message=(
            f"Здравствуйте, {user.username}!\n\n"
            f"Ваш код подтверждения: {code}\n\n"
            f"Введите его на сайте Rohat, чтобы завершить регистрацию. Код действует {minutes} минут.\n"
            "Если вы не регистрировались, просто проигнорируйте это письмо."
        ),
        html_message=(
            f'<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#0f172a">'
            f'<h2 style="color:#059669;margin:0 0 12px">Rohat</h2>'
            f"<p>Здравствуйте, {user.username}!</p>"
            f"<p>Ваш код подтверждения:</p>"
            f'<p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#ecfdf5;border-radius:12px;'
            f'padding:16px;text-align:center;margin:16px 0">{code}</p>'
            f"<p>Введите его на сайте, чтобы завершить регистрацию. Код действует {minutes} минут.</p>"
            f'<p style="color:#64748b;font-size:13px">Если вы не регистрировались, просто проигнорируйте это письмо.</p>'
            f"</div>"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )
    if settings.MAILERS["default"]["BACKEND"].endswith("console.EmailBackend"):
        # Without SMTP the letter only goes to the console, so show the code plainly for development.
        print(f"[email code] {user.email}: {code}", flush=True)


def check_code(user, code):
    """Returns "ok", "wrong", "expired", "too_many" or "missing"."""
    entry = getattr(user, "email_code", None)
    if entry is None:
        return "missing"
    if entry.attempts >= MAX_ATTEMPTS:
        return "too_many"
    if timezone.now() - entry.sent_at > CODE_LIFETIME:
        return "expired"
    if not check_password(code, entry.code_hash):
        entry.attempts += 1
        entry.save(update_fields=["attempts"])
        return "too_many" if entry.attempts >= MAX_ATTEMPTS else "wrong"
    entry.delete()
    return "ok"


def can_resend(user):
    entry = getattr(user, "email_code", None)
    return entry is None or timezone.now() - entry.sent_at >= RESEND_AFTER
