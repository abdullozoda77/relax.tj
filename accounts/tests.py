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


GOOGLE = "/api/auth/google/"


@override_settings(GOOGLE_CLIENT_ID="test-client.apps.googleusercontent.com")
class GoogleLoginTests(APITestCase):
    def setUp(self):
        cache.clear()

    def login(self, **claims):
        claims = {"iss": "https://accounts.google.com", "email": "Ali.Valiev@gmail.com", "email_verified": True,
                  "given_name": "Ali", "family_name": "Valiev", **claims}
        with mock.patch("accounts.google.id_token.verify_oauth2_token", return_value=claims) as verify:
            response = self.client.post(GOOGLE, {"credential": "token"}, format="json")
        verify.assert_called_once()
        self.assertEqual(verify.call_args.args[2], "test-client.apps.googleusercontent.com")
        return response

    def test_client_id_is_public(self):
        self.assertEqual(self.client.get(GOOGLE).json(), {"client_id": "test-client.apps.googleusercontent.com"})

    def test_new_user_is_created_without_password(self):
        response = self.login()
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()["created"])
        self.assertIn("access", response.json()["tokens"])
        user = User.objects.get(email="ali.valiev@gmail.com")
        self.assertEqual((user.username, user.first_name, user.last_name), ("ali.valiev", "Ali", "Valiev"))
        self.assertTrue(user.email_verified)
        self.assertFalse(user.has_usable_password())

    def test_existing_email_logs_in_and_confirms_it(self):
        user = User.objects.create_user("ali", "ali.valiev@gmail.com", "Qz7-rohat-test-4821", email_verified=False)
        response = self.login()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["id"], user.id)
        user.refresh_from_db()
        self.assertTrue(user.email_verified)
        self.assertEqual(User.objects.count(), 1)

    def test_taken_username_gets_a_number(self):
        User.objects.create_user("ali.valiev", "other@example.com", "Qz7-rohat-test-4821")
        self.assertEqual(self.login().json()["user"]["username"], "ali.valiev2")

    def test_unverified_google_email_is_refused(self):
        self.assertEqual(self.login(email_verified=False).status_code, 400)
        self.assertFalse(User.objects.filter(email__iexact="ali.valiev@gmail.com").exists())

    def test_blocked_user_is_refused(self):
        User.objects.create_user("ali", "ali.valiev@gmail.com", "Qz7-rohat-test-4821", is_active=False)
        self.assertEqual(self.login().status_code, 403)

    def test_invalid_token(self):
        with mock.patch("accounts.google.id_token.verify_oauth2_token", side_effect=ValueError("bad")):
            self.assertEqual(self.client.post(GOOGLE, {"credential": "x"}, format="json").status_code, 400)

    @override_settings(GOOGLE_CLIENT_ID="")
    def test_not_configured(self):
        self.assertEqual(self.client.post(GOOGLE, {"credential": "x"}, format="json").status_code, 503)
