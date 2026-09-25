from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ["id", "username", "email", "phone_number", "role", "is_active", "date_joined"]
    list_filter = ["role", "is_active", "is_staff"]
    search_fields = ["username", "email", "first_name", "last_name", "phone_number"]
    fieldsets = UserAdmin.fieldsets + (
        ("Relax.tj", {"fields": ("role", "phone_number", "avatar", "bio")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Relax.tj", {"fields": ("email", "role", "phone_number")}),
    )
