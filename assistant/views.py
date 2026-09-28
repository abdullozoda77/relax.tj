import logging

import anthropic
from django.conf import settings
from drf_yasg.utils import swagger_auto_schema
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from places.serializers import request_language

from .knowledge import system_prompt
from .tools import TOOLS, run_tool

logger = logging.getLogger(__name__)

LANGUAGE_NAMES = {"ru": "Russian", "tg": "Tajik", "en": "English"}
MAX_HISTORY = 20  # messages sent back to the model; older ones are dropped
MAX_TOOL_STEPS = 6  # model calls per answer (each tool round is one more call)


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


def error(code, detail, http_status):
    return Response({"code": code, "detail": detail}, status=http_status)


class AssistantView(APIView):
    """AI assistant that knows the site: every place, region and public route, and how the site works.

    GET tells whether the assistant is set up; POST sends the conversation and returns the answer."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = "assistant"

    def get_throttles(self):
        # Only questions are limited; checking the status is free.
        return [*super().get_throttles(), ScopedRateThrottle()] if self.request.method == "POST" else []

    def get(self, request):
        return Response({"enabled": bool(settings.ANTHROPIC_API_KEY)})

    @swagger_auto_schema(request_body=ChatSerializer)
    def post(self, request):
        serializer = ChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not settings.ANTHROPIC_API_KEY:
            return error("not_configured", "The AI assistant is not set up yet.", status.HTTP_503_SERVICE_UNAVAILABLE)

        language = LANGUAGE_NAMES[request_language(request)]
        system = [
            # Instructions, site guide and catalog: the same for everyone, so the API caches them.
            {"type": "text", "text": system_prompt(), "cache_control": {"type": "ephemeral"}},
            {"type": "text", "text": f"Site language of this visitor: {language}."},
        ]
        messages = [{"role": m["role"], "content": m["content"]} for m in serializer.validated_data["messages"]]
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=120, max_retries=2)

        try:
            for _ in range(MAX_TOOL_STEPS):
                response = client.beta.messages.create(
                    model=settings.ASSISTANT_MODEL,
                    max_tokens=16000,
                    system=system,
                    tools=TOOLS,
                    messages=messages,
                    thinking={"type": "adaptive"},
                    output_config={"effort": settings.ASSISTANT_EFFORT},
                    # If a safety classifier declines, the API answers with its recommended fallback model.
                    betas=["server-side-fallback-2026-07-01"],
                    fallbacks="default",
                )
                if response.stop_reason == "refusal":
                    return Response({"reply": "", "refused": True})
                if response.stop_reason in ("tool_use", "pause_turn"):
                    # The whole content goes back (thinking and tool calls), then the tool results.
                    messages.append({"role": "assistant", "content": response.content})
                    results = []
                    for block in response.content:
                        if block.type == "tool_use":
                            text, is_error = run_tool(block.name, block.input)
                            results.append({"type": "tool_result", "tool_use_id": block.id, "content": text, "is_error": is_error})
                    if results:
                        messages.append({"role": "user", "content": results})
                    continue
                reply = "".join(block.text for block in response.content if block.type == "text").strip()
                return Response({"reply": reply, "truncated": response.stop_reason == "max_tokens"})
            return error("too_long", "The question needed too many steps. Try asking it more simply.", status.HTTP_502_BAD_GATEWAY)
        except anthropic.AuthenticationError:
            logger.error("AI assistant: the ANTHROPIC_API_KEY was rejected")
            return error("not_configured", "The AI assistant key is not valid.", status.HTTP_503_SERVICE_UNAVAILABLE)
        except anthropic.RateLimitError:
            return error("busy", "The AI assistant is busy. Try again in a minute.", status.HTTP_429_TOO_MANY_REQUESTS)
        except anthropic.BadRequestError as e:
            logger.error("AI assistant: bad request: %s", e.message)
            return error("unavailable", "The AI assistant could not answer.", status.HTTP_502_BAD_GATEWAY)
        except (anthropic.APIStatusError, anthropic.APIConnectionError) as e:
            logger.warning("AI assistant: API unavailable: %s", e)
            return error("unavailable", "The AI assistant is not available right now.", status.HTTP_503_SERVICE_UNAVAILABLE)
