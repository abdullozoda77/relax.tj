import smtplib

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import generics, permissions, status, viewsets, mixins
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from drf_yasg.utils import swagger_auto_schema
from places.permissions import IsAdmin
from .emails import can_resend, check_code, deliver, send_confirmation_code
from .models import User
from .serializers import (
    PasswordResetSerializer, PasswordResetConfirmSerializer,
    RegisterSerializer, UserSerializer, ChangePasswordSerializer,
    LogoutSerializer, AdminUserSerializer,
    LoginSerializer, ConfirmEmailSerializer, ResendConfirmationSerializer,
)

def tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # No tokens yet: the account can be used after the code from the email is entered (ConfirmEmailView).
        # If the letter cannot be sent, the new account is not kept, so the person can simply try again.
        try:
            with transaction.atomic():
                user = serializer.save()
                send_confirmation_code(user)
        except (smtplib.SMTPException, OSError):
            return Response({"detail": EMAIL_NOT_SENT}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(
            {"detail": "We sent a confirmation code to your email.", "email": user.email},
            status=status.HTTP_201_CREATED,
        )

class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


EMAIL_NOT_SENT = "Could not send the email. Please try again later."
CODE_ERRORS = {
    "wrong": "The code is wrong.",
    "expired": "The code has expired. Ask for a new one.",
    "too_many": "Too many wrong tries. Ask for a new code.",
    "missing": "The code is wrong.",
}


class ConfirmEmailView(APIView):
    """Checks the 6-digit code from the letter, confirms the email and logs the user in."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @swagger_auto_schema(request_body=ConfirmEmailSerializer)
    def post(self, request):
        serializer = ConfirmEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(
            email__iexact=serializer.validated_data["email"], is_active=True, email_verified=False
        ).select_related("email_code").first()
        result = check_code(user, serializer.validated_data["code"]) if user else "missing"
        if result != "ok":
            raise ValidationError({"code": CODE_ERRORS[result]})
        user.email_verified = True
        user.save(update_fields=["email_verified"])
        return Response({"user": UserSerializer(user, context={"request": request}).data, "tokens": tokens_for(user)})


WAIT_BEFORE_RESEND = "Please wait a minute before asking for a new code."


class ResendConfirmationView(APIView):
    """Sends the confirmation letter again. The answer is the same whether the email exists or not."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @swagger_auto_schema(request_body=ResendConfirmationSerializer)
    def post(self, request):
        serializer = ResendConfirmationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(
            email__iexact=serializer.validated_data["email"], is_active=True, email_verified=False
        ).select_related("email_code").first()
        if user:
            if not can_resend(user):
                return Response({"detail": WAIT_BEFORE_RESEND}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            try:
                send_confirmation_code(user)
            except (smtplib.SMTPException, OSError):
                return Response({"detail": EMAIL_NOT_SENT}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({"detail": "If this email is waiting for confirmation, we sent a new code."})

class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(request_body=LogoutSerializer)
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            RefreshToken(serializer.validated_data["refresh"]).blacklist()
        except TokenError:
            return Response({"detail": "Token is invalid or already logged out."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Logged out."}, status=status.HTTP_205_RESET_CONTENT)

class ProfileView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get(self, request, *args, **kwargs):
        data = self.get_serializer(request.user).data
        data["stats"] = {
            "favorites": request.user.favorites.count(),
            "reviews": request.user.reviews.count(),
            "travel_lists": request.user.travel_lists.count(),
            "suggestions": request.user.place_suggestions.count(),
        }
        return Response(data)

    def destroy(self, request, *args, **kwargs):
        request.user.is_active = False
        request.user.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(request_body=ChangePasswordSerializer)
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password changed. Please log in again."})

class UserAdminViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]
    search_fields = ["username", "email", "first_name", "last_name", "phone_number"]
    filterset_fields = ["role", "is_active"]
    ordering_fields = ["date_joined", "username"]

    def get_queryset(self):
        return User.objects.order_by("-date_joined")

    def perform_update(self, serializer):
        user = serializer.instance
        if user == self.request.user and serializer.validated_data.get("is_active") is False:
            raise ValidationError({"is_active": "You cannot block yourself."})
        serializer.save()


class PasswordResetView(APIView):
    """Sends a link to reset the password. The answer is the same whether the email exists or not."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @swagger_auto_schema(request_body=PasswordResetSerializer)
    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        for user in User.objects.filter(email__iexact=email, is_active=True):
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            deliver(
                subject="Rohat — восстановление пароля",
                message=(
                    f"Здравствуйте, {user.username}!\n\n"
                    f"Чтобы задать новый пароль, откройте ссылку:\n{link}\n\n"
                    "Если вы не запрашивали восстановление, просто проигнорируйте это письмо."
                ),
                recipient=user.email,
            )
            if settings.DEBUG:
                # The console email body is base64 encoded, so print the link separately for development.
                print(f"[password reset] {user.email}: {link}", flush=True)
        return Response({"detail": "Если такой email зарегистрирован, мы отправили на него ссылку для восстановления пароля."})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @swagger_auto_schema(request_body=PasswordResetConfirmSerializer)
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Пароль изменён. Теперь можно войти с новым паролем."})
