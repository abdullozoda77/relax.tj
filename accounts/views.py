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
from .models import User
from .serializers import (
    RegisterSerializer, UserSerializer, ChangePasswordSerializer,
    LogoutSerializer, AdminUserSerializer,
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
        user = serializer.save()
        return Response(
            {"user": UserSerializer(user, context={"request": request}).data, "tokens": tokens_for(user)},
            status=status.HTTP_201_CREATED,
        )

class LoginView(TokenObtainPairView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

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