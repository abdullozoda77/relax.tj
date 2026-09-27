from django.contrib.auth.models import AbstractUser
from django.db import models
from places.validators import image_validators


class User(AbstractUser):
    # user: reviews, favourites, routes, suggestions.
    # moderator: also checks suggestions (approve / reject) and removes bad reviews.
    # admin: everything, including places, users, roles and statistics.
    ROLES = (("user", "User"), ("moderator", "Moderator"), ("admin", "Admin"))
    role = models.CharField(max_length=20, choices=ROLES, default="user")
    avatar = models.ImageField(upload_to="avatars/", validators=image_validators, blank=True, null=True)
    phone_number = models.CharField(max_length=20, unique=True, blank=True, null=True)
    bio = models.TextField(blank=True)
    # Set to False for people who sign up on the site until they open the link in the confirmation email.
    # Accounts made in other ways (createsuperuser, the admin, the seed command) count as confirmed.
    email_verified = models.BooleanField(default=True)

    def __str__(self):
        return self.username


class EmailConfirmationCode(models.Model):
    """The 6-digit code from the confirmation letter. Only a hash is stored, like a password;
    sending a new code replaces the old one."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="email_code")
    code_hash = models.CharField(max_length=128)
    sent_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)  # wrong tries with this code
