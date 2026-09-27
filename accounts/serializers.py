from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers, status
from rest_framework.exceptions import APIException
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User

EMAIL_NOT_CONFIRMED = "Confirm your email first: enter the code from the letter we sent you."


class EmailNotConfirmed(APIException):
    """Login refused until the email is confirmed; `code` and `email` let the site offer to resend the letter."""

    status_code = status.HTTP_403_FORBIDDEN
    default_code = "email_not_confirmed"

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "phone_number", "password", "password2"]
        extra_kwargs = {"email": {"required": True, "allow_blank": False}}

    def validate_email(self, value):
        # The confirmation link goes to this address, so one email can belong to only one account.
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        return User.objects.create_user(**validated_data, email_verified=False)


class LoginSerializer(TokenObtainPairSerializer):
    """Normal JWT login, but only after the email is confirmed."""

    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.email_verified:
            raise EmailNotConfirmed({"detail": EMAIL_NOT_CONFIRMED, "code": "email_not_confirmed", "email": self.user.email})
        return data


class ConfirmEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.RegexField(r"^\d{6}$", error_messages={"invalid": "The code has 6 digits."})


class ResendConfirmationSerializer(serializers.Serializer):
    email = serializers.EmailField()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "phone_number", "avatar", "bio", "role", "is_staff", "date_joined"]
        read_only_fields = ["id", "username", "role", "is_staff", "date_joined"]

class UserShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "avatar"]

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_old_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user
class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class AdminUserSerializer(serializers.ModelSerializer):
    """For admins: see users and change their role or block them."""

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "phone_number", "avatar", "role", "is_active", "is_staff", "date_joined", "last_login"]
        read_only_fields = ["id", "username", "email", "first_name", "last_name", "phone_number", "avatar", "is_staff", "date_joined", "last_login"]


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate(self, attrs):
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(attrs["uid"])), is_active=True)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            user = None
        if user is None or not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError({"token": "Ссылка недействительна или устарела. Запросите новую."})
        attrs["user"] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user
