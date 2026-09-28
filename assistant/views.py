from drf_yasg.utils import swagger_auto_schema
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from places.serializers import request_language

from .knowledge import system_prompt
from .providers import AssistantError, active_provider, ask

LANGUAGE_NAMES = {"ru": "Russian", "tg": "Tajik", "en": "English"}
MAX_HISTORY = 20  # messages sent back to the model; older ones are dropped


class ChatMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField(max_length=4000, trim_whitespace=True)


class ChatSerializer(serializers.Serializer):
    messages = ChatMessageSerializer(many=True, allow_empty=False)

    def validate_messages(self, messages):
        messages = messages[-MAX_HISTORY:]
        while messages and messages[0]["role"] != "user":
            messages = messages[1:]
        if not messages or messages[-1]["role"] != "user":
            raise serializers.ValidationError("The last message must be from the user.")
        if len(messages[-1]["content"]) > 2000:
            raise serializers.ValidationError("The question is too long (2000 characters at most).")
        return messages


class AssistantView(APIView):
    """AI assistant that knows the site: every place, region and public route, and how the site works.

    GET tells whether the assistant is set up; POST sends the conversation and returns the answer."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = "assistant"

    def get_throttles(self):
        # Only questions are limited; checking the status is free.
        return [*super().get_throttles(), ScopedRateThrottle()] if self.request.method == "POST" else []

    def get(self, request):
        return Response({"enabled": active_provider() is not None})

    @swagger_auto_schema(request_body=ChatSerializer)
    def post(self, request):
        serializer = ChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if active_provider() is None:
            return Response({"code": "not_configured", "detail": "The AI assistant is not set up yet."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        visitor_note = f"Site language of this visitor: {LANGUAGE_NAMES[request_language(request)]}."
        messages = [{"role": m["role"], "content": m["content"]} for m in serializer.validated_data["messages"]]
        try:
            return Response(ask(system_prompt(), visitor_note, messages))
        except AssistantError as error:
            return Response({"code": error.code, "detail": error.detail}, status=error.http_status)
