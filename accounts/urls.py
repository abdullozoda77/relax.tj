from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView, LoginView, PasswordResetView, PasswordResetConfirmView, LogoutView, ProfileView, ChangePasswordView,
    UserAdminViewSet, ConfirmEmailView, ResendConfirmationView,
)

router = DefaultRouter()
router.register("users", UserAdminViewSet, basename="users")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("confirm-email/", ConfirmEmailView.as_view(), name="confirm-email"),
    path("resend-confirmation/", ResendConfirmationView.as_view(), name="resend-confirmation"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("password-reset/", PasswordResetView.as_view(), name="password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("", include(router.urls)),
]
