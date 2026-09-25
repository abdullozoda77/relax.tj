from django.contrib.auth.models import AbstractUser
from django.db import models
from places.validators import image_validators


class User(AbstractUser):
    ROLES = (("user", "User"), ("admin", "Admin"))
    role = models.CharField(max_length=20, choices=ROLES, default="user")
    avatar = models.ImageField(upload_to="avatars/", validators=image_validators, blank=True, null=True)
    phone_number = models.CharField(max_length=20, unique=True, blank=True, null=True)
    bio = models.TextField(blank=True)

    def __str__(self):
        return self.username
