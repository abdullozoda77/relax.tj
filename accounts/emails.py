"""Email confirmation after registration: a one-time link sent to the new user's email."""
from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


class EmailConfirmationTokenGenerator(PasswordResetTokenGenerator):
    """Like password reset links, but a link stops working once the email is confirmed
    (and if the email is changed), because both are part of the token."""

    key_salt = "accounts.emails.EmailConfirmationTokenGenerator"

    def _make_hash_value(self, user, timestamp):
        return f"{user.pk}{user.email}{user.email_verified}{timestamp}"


email_confirmation_token = EmailConfirmationTokenGenerator()


def send_confirmation_email(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_confirmation_token.make_token(user)
    link = f"{settings.FRONTEND_URL}/confirm-email?uid={uid}&token={token}"
    send_mail(
        subject="Relax.tj — подтвердите email",
        message=(
            f"Здравствуйте, {user.username}!\n\n"
            f"Чтобы завершить регистрацию на Relax.tj, подтвердите email по ссылке:\n{link}\n\n"
            "Если вы не регистрировались, просто проигнорируйте это письмо."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )
    if settings.DEBUG:
        # The console email body is base64 encoded, so print the link separately for development.
        print(f"[email confirm] {user.email}: {link}", flush=True)
