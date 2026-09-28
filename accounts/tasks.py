"""Background tasks (Celery): sending emails and the nightly cleanup."""
import smtplib

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.core.management import call_command
from django.utils import timezone

from .models import EmailConfirmationCode


@shared_task(autoretry_for=(smtplib.SMTPException, OSError), retry_backoff=10, retry_backoff_max=300, max_retries=5)
def send_email(subject, message, recipient, html_message=None):
    """Sends one email; if the mail server fails, tries again after 10 s, 20 s, 40 s… (5 times at most)."""
    send_mail(
        subject=subject,
        message=message,
        html_message=html_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient],
    )


@shared_task
def cleanup():
    """Every night: removes email codes that have expired and login tokens that can no longer be used."""
    from .emails import CODE_LIFETIME

    codes = EmailConfirmationCode.objects.filter(sent_at__lt=timezone.now() - CODE_LIFETIME).delete()[0]
    call_command("flushexpiredtokens")
    return f"expired email codes removed: {codes}"
