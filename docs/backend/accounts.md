# `accounts/` — users, roles, authentication, email

| File | Purpose |
|---|---|
| `models.py` | `User` (custom, with role), `EmailConfirmationCode` |
| `serializers.py` | Register, login, confirm email, profile, password change/reset, admin user serializers |
| `views.py` | Auth endpoints and the admin users ViewSet |
| `urls.py` | Routes under `/api/auth/` |
| `emails.py` | Sending emails (direct or via Celery), confirmation codes: create / check / resend |
| `tasks.py` | Celery tasks: `send_email` (with retries), `cleanup` (nightly) |
| `admin.py` | Django admin for `User` |
| `tests.py` | Email delivery tests (with and without Celery) |
| `migrations/` | `0001_initial`, `0002_alter_user_avatar`, `0003_moderator_role`, `0004_email_verified`, `0005_email_confirmation_code` |

---

## `models.py`

### `User(AbstractUser)`
Extends Django's built-in user (username, email, password, first/last name, is_active, is_staff, date_joined, …).

| Field | Type | Notes |
|---|---|---|
| `role` | `CharField(20)` choices `user` / `moderator` / `admin`, default `user` | RBAC role |
| `avatar` | `ImageField(upload_to="avatars/")` | Validated by `places.validators.image_validators` |
| `phone_number` | `CharField(20, unique, null)` | `null` (not `""`) when empty, so uniqueness does not clash |
| `bio` | `TextField(blank)` | |
| `email_verified` | `BooleanField(default=True)` | `False` for site sign-ups until the code is entered; accounts made by `createsuperuser`/admin/seed count as confirmed |

Roles: **user** — reviews, favourites, routes, suggestions; **moderator** — also approves/rejects suggestions and
deletes bad reviews; **admin** — everything (places, users, roles, statistics).

### `EmailConfirmationCode`
One row per user (`OneToOneField`, `related_name="email_code"`).
`code_hash` (hashed like a password), `sent_at`, `attempts` (wrong tries). Sending a new code replaces the old one.

---

## `emails.py`

Constants: `CODE_LIFETIME = 15 min`, `MAX_ATTEMPTS = 5`, `RESEND_AFTER = 60 s`.

| Function | What it does |
|---|---|
| `deliver(subject, message, recipient, html_message=None)` | If `CELERY_BROKER_URL` is set → `transaction.on_commit(lambda: send_email.delay(...))` (queued only after the DB commit). Otherwise → `send_mail(...)` right away; SMTP errors propagate to the caller. |
| `send_confirmation_code(user)` | Generates `f"{secrets.randbelow(10**6):06d}"`, stores `make_password(code)` with `update_or_create`, sends plain-text + HTML email ("Rohat — код подтверждения"). With the console backend also prints `[email code] email: code`. |
| `check_code(user, code)` | Returns `"ok"`, `"wrong"`, `"expired"`, `"too_many"` or `"missing"`. Increments `attempts` on a wrong code; deletes the row on success. |
| `can_resend(user)` | `True` if there is no code or 60 s passed since `sent_at`. |

## `tasks.py` (Celery)

| Task | Details |
|---|---|
| `send_email(subject, message, recipient, html_message=None)` | `@shared_task(autoretry_for=(SMTPException, OSError), retry_backoff=10, retry_backoff_max=300, max_retries=5)` → retries after 10 s, 20 s, 40 s… |
| `cleanup()` | Deletes `EmailConfirmationCode` rows older than `CODE_LIFETIME` and runs `flushexpiredtokens` (SimpleJWT blacklist cleanup). Scheduled at 03:30 by Celery beat. |

---

## `serializers.py`

| Serializer | Fields / logic |
|---|---|
| `EmailNotConfirmed(APIException)` | 403, `default_code="email_not_confirmed"` |
| `RegisterSerializer` | `username, email (required), first_name, last_name, phone_number, password, password2`. `validate_password` (Django validators), unique email (case-insensitive), passwords must match. `create()` → `User.objects.create_user(..., email_verified=False)` |
| `LoginSerializer(TokenObtainPairSerializer)` | Normal JWT login; if `email_verified` is False raises `EmailNotConfirmed({"detail", "code": "email_not_confirmed", "email"})` |
| `ConfirmEmailSerializer` | `email`, `code` (regex `^\d{6}$`) |
| `ResendConfirmationSerializer` | `email` |
| `UserSerializer` | Profile: `id, username, email, first_name, last_name, phone_number, avatar, bio, role, is_staff, date_joined`; read-only `id, username, role, is_staff, date_joined` |
| `UserShortSerializer` | `id, username, avatar` — embedded in reviews, routes, suggestions |
| `ChangePasswordSerializer` | `old_password` (checked), `new_password` (validated); `save()` sets the password |
| `LogoutSerializer` | `refresh` |
| `AdminUserSerializer` | For admins: everything read-only except `role` and `is_active` |
| `PasswordResetSerializer` | `email` |
| `PasswordResetConfirmSerializer` | `uid` (base64 pk), `token`, `new_password`; validates with `default_token_generator.check_token`; `save()` sets the password |

## `views.py`

| View | URL | Permission / throttle | Behaviour |
|---|---|---|---|
| `tokens_for(user)` | helper | — | Returns `{"refresh", "access"}` via `RefreshToken.for_user` |
| `RegisterView(CreateAPIView)` | `POST register/` | AllowAny, `auth` 10/min | In `transaction.atomic()`: save user + `send_confirmation_code`. If SMTP fails → 503 and the user is rolled back. Returns 201 `{detail, email}` (no tokens) |
| `LoginView(TokenObtainPairView)` | `POST login/` | `auth` | Uses `LoginSerializer` |
| `ConfirmEmailView` | `POST confirm-email/` | AllowAny, `auth` | Finds the active unverified user by email, `check_code`; errors mapped by `CODE_ERRORS`; on success sets `email_verified=True` and returns `{user, tokens}` |
| `ResendConfirmationView` | `POST resend-confirmation/` | AllowAny, `auth` | 429 if `can_resend` is false; same answer whether the email exists or not |
| `TokenRefreshView` (SimpleJWT) | `POST token/refresh/` | — | New access (+ rotated refresh) |
| `LogoutView` | `POST logout/` | IsAuthenticated | Blacklists the refresh token; 205 |
| `ProfileView(RetrieveUpdateDestroyAPIView)` | `GET/PUT/PATCH/DELETE profile/` | IsAuthenticated | `get_object()` = current user. GET adds `stats` (favorites, reviews, travel_lists, suggestions counts). DELETE = soft delete (`is_active=False`) |
| `ChangePasswordView` | `POST change-password/` | IsAuthenticated | |
| `UserAdminViewSet` (list/retrieve/update) | `users/`, `users/{id}/` | `IsAdmin` | search `username,email,first_name,last_name,phone_number`; filter `role,is_active`; ordering `date_joined,username`; an admin cannot block himself |
| `PasswordResetView` | `POST password-reset/` | AllowAny, `auth` | For every active user with that email builds `FRONTEND_URL/reset-password?uid=&token=` and `deliver()`s it; prints the link in DEBUG |
| `PasswordResetConfirmView` | `POST password-reset/confirm/` | AllowAny, `auth` | |

Security notes: hashed codes, attempt limit, resend cooldown, throttling, identical answers for unknown emails
(prevents finding out which emails are registered), refresh token rotation + blacklist.

## `urls.py`
Plain `path()`s for the views above plus a `DefaultRouter` with `users` → `UserAdminViewSet`.

## `admin.py`
`CustomUserAdmin(UserAdmin)`: list `id, username, email, phone_number, role, is_active, date_joined`; filters
`role, is_active, is_staff`; extra "Rohat" fieldset with `role, phone_number, avatar, bio`.

## `tests.py` — `EmailDeliveryTests`
- without Celery the code is sent at once;
- with Celery the email is queued after the transaction commits;
- `send_email` task sends a message;
- `cleanup` removes only expired codes.
