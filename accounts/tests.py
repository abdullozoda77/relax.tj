import re
from datetime import timedelta
from unittest import mock

from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import EmailConfirmationCode, User
from .tasks import cleanup, send_email

REGISTER = "/api/auth/register/"


class EmailDeliveryTests(APITestCase):
    def setUp(self):
        cache.clear()  # throttling counters

    def register(self, username="traveller", email="traveller@example.com"):
        password = "Qz7-rohat-test-4821"
        return self.client.post(
            REGISTER, {"username": username, "email": email, "password": password, "password2": password}, format="json"
        )

    @override_settings(CELERY_BROKER_URL="")
    def test_without_celery_the_code_is_sent_at_once(self):
        response = self.register()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["traveller@example.com"])
        self.assertRegex(mail.outbox[0].body, r"\b\d{6}\b")

    @override_settings(CELERY_BROKER_URL="redis://127.0.0.1:6379/7")
    def test_with_celery_the_email_is_queued_after_saving(self):
        with mock.patch("accounts.tasks.send_email.delay") as delay, self.captureOnCommitCallbacks(execute=True):
            response = self.register()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(mail.outbox), 0)  # the worker sends it, not the request
        delay.assert_called_once()
        subject, message, recipient, _html = delay.call_args.args
        self.assertEqual(recipient, "traveller@example.com")
        self.assertIn("код подтверждения", subject)
        self.assertTrue(re.search(r"\b\d{6}\b", message))

    def test_send_email_task(self):
        send_email("Тема", "Текст письма", "someone@example.com")
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, "Тема")

    def test_cleanup_removes_only_expired_codes(self):
        old = User.objects.create_user("old", "old@example.com", "x")
        new = User.objects.create_user("new", "new@example.com", "x")
        EmailConfirmationCode.objects.create(user=old, code_hash="-", sent_at=timezone.now() - timedelta(hours=1))
        EmailConfirmationCode.objects.create(user=new, code_hash="-", sent_at=timezone.now())
        cleanup()
        self.assertEqual(list(EmailConfirmationCode.objects.values_list("user__username", flat=True)), ["new"])
