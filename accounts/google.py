"""Continue with Google: the site gets an ID token from Google's button and sends it here.
The token is checked with Google's public keys (no request to Google per login after the keys are cached),
then the user with that email is logged in, or a new account is made for it."""

import re

from django.conf import settings
from django.db import transaction
from drf_yasg.utils import swagger_auto_schema
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import UserSerializer

GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}
google_session = google_requests.Request()  # reuses the connection and caches Google's keys


class GoogleLoginSerializer(serializers.Serializer):
    credential = serializers.CharField()


def verify_google_token(credential):
    """Returns the token's claims, or None if it is not a valid Google ID token for this site."""
    try:
        claims = id_token.verify_oauth2_token(credential, google_session, settings.GOOGLE_CLIENT_ID)
    except ValueError:
        return None
    if claims.get("iss") not in GOOGLE_ISSUERS or not claims.get("email") or not claims.get("email_verified"):
        return None
    return claims


def free_username(email):
    base = re.sub(r"[^\w.@+-]", "", email.split("@")[0])[:140] or "user"
    username, n = base, 1
    while User.objects.filter(username__iexact=username).exists():
        n += 1
        username = f"{base}{n}"
    return username


def user_for_google(claims):
    """The account with this email (Google has confirmed the address), or a new one without a password."""
    email = claims["email"].lower()
    user = User.objects.filter(email__iexact=email).order_by("id").first()
    if user:
        if not user.email_verified:
            user.email_verified = True
            user.save(update_fields=["email_verified"])
        return user, False
    user = User(
        username=free_username(email),
        email=email,
        first_name=claims.get("given_name", "")[:150],
        last_name=claims.get("family_name", "")[:150],
        email_verified=True,
    )
    user.set_unusable_password()  # the password can be set later through "Forgot password?"
    user.save()
    return user, True


class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def get(self, request):
        """The client ID for Google's button; empty while Google login is not set up."""
        return Response({"client_id": settings.GOOGLE_CLIENT_ID})

    @swagger_auto_schema(request_body=GoogleLoginSerializer)
    def post(self, request):
        if not settings.GOOGLE_CLIENT_ID:
            return Response({"detail": "Google login is not set up."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        serializer = GoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        claims = verify_google_token(serializer.validated_data["credential"])
        if not claims:
            return Response({"detail": "Could not sign in with Google. Please try again."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            user, created = user_for_google(claims)
        if not user.is_active:
            return Response({"detail": "This account is blocked."}, status=status.HTTP_403_FORBIDDEN)
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user, context={"request": request}).data,
                "tokens": {"refresh": str(refresh), "access": str(refresh.access_token)},
                "created": created,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
