import json
from types import SimpleNamespace
from unittest import mock

import anthropic
import httpx2
from django.core.cache import cache
from django.test import override_settings
from google.genai import errors as genai_errors
from google.genai import types as genai_types
from rest_framework.test import APITestCase

from places.models import Place, Region

URL = "/api/assistant/"


class AssistantTestCase(APITestCase):
    def setUp(self):
        cache.clear()  # throttling counters
        region = Region.objects.create(name="Согдийская область")
        self.place = Place.objects.create(region=region, name="Искандеркуль", name_en="Iskanderkul", description="Горное озеро.")

    def ask(self, text="Расскажи про Искандеркуль"):
        return self.client.post(URL, {"messages": [{"role": "user", "content": text}]}, format="json")


@override_settings(GEMINI_API_KEY="", ANTHROPIC_API_KEY="")
class NotConfiguredTests(AssistantTestCase):
    def test_not_configured(self):
        self.assertEqual(self.client.get(URL).json(), {"enabled": False})
        response = self.ask()
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["code"], "not_configured")

    def test_last_message_must_be_from_user(self):
        response = self.client.post(URL, {"messages": [{"role": "assistant", "content": "Салом"}]}, format="json")
        self.assertEqual(response.status_code, 400)


def gemini_response(text=None, calls=()):
    parts = [genai_types.Part(function_call=call) for call in calls] or [genai_types.Part.from_text(text=text)]
    content = genai_types.Content(role="model", parts=parts)
    return SimpleNamespace(
        candidates=[SimpleNamespace(content=content, finish_reason="STOP")],
        function_calls=list(calls) or None,
        text=text,
    )


@override_settings(GEMINI_API_KEY="test-key", ANTHROPIC_API_KEY="")
class GeminiTests(AssistantTestCase):
    def test_catalog_and_tool_loop(self):
        call = genai_types.FunctionCall(id="call_1", name="get_place_details", args={"place_ids": [self.place.id]})
        with mock.patch("google.genai.Client") as client_class:
            generate = client_class.return_value.models.generate_content
            generate.side_effect = [
                gemini_response(calls=[call]),
                gemini_response(text=f"[Искандеркуль](/places/{self.place.id}) — горное озеро."),
            ]
            response = self.ask()

        self.assertEqual(response.status_code, 200)
        self.assertIn(f"/places/{self.place.id}", response.json()["reply"])
        first, second = generate.call_args_list
        system = first.kwargs["config"].system_instruction
        self.assertIn(f"{self.place.id} | Искандеркуль | Iskanderkul", system)
        self.assertIn("Russian", system)
        # The result of the tool call is sent back with the same call id.
        result = second.kwargs["contents"][-1].parts[0].function_response
        self.assertEqual((result.id, result.name), ("call_1", "get_place_details"))
        self.assertEqual(result.response["places"][0]["description"], "Горное озеро.")

    def test_free_quota_used_up(self):
        error = genai_errors.APIError(429, {"error": {"message": "Quota exceeded", "status": "RESOURCE_EXHAUSTED"}})
        with mock.patch("google.genai.Client") as client_class:
            client_class.return_value.models.generate_content.side_effect = error
            response = self.ask()
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.json()["code"], "busy")

    def test_bad_key(self):
        error = genai_errors.APIError(400, {"error": {"message": "API key not valid. Please pass a valid API key.", "status": "INVALID_ARGUMENT"}})
        with mock.patch("google.genai.Client") as client_class:
            client_class.return_value.models.generate_content.side_effect = error
            response = self.ask()
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["code"], "not_configured")


def claude_text(text):
    return SimpleNamespace(stop_reason="end_turn", content=[SimpleNamespace(type="text", text=text)])


def claude_tool(name, tool_input):
    return SimpleNamespace(stop_reason="tool_use", content=[SimpleNamespace(type="tool_use", id="toolu_1", name=name, input=tool_input)])


@override_settings(GEMINI_API_KEY="", ANTHROPIC_API_KEY="test-key")
class ClaudeTests(AssistantTestCase):
    def test_catalog_and_tool_loop(self):
        with mock.patch("anthropic.Anthropic") as client_class:
            create = client_class.return_value.beta.messages.create
            create.side_effect = [
                claude_tool("get_place_details", {"place_ids": [self.place.id]}),
                claude_text(f"[Искандеркуль](/places/{self.place.id}) — горное озеро."),
            ]
            response = self.ask()

        self.assertEqual(response.status_code, 200)
        self.assertIn(f"/places/{self.place.id}", response.json()["reply"])
        first, second = create.call_args_list
        # The catalog of places is in the cached system prompt, the visitor's language after it.
        self.assertIn(f"{self.place.id} | Искандеркуль | Iskanderkul", first.kwargs["system"][0]["text"])
        self.assertEqual(first.kwargs["system"][0]["cache_control"], {"type": "ephemeral"})
        self.assertIn("Russian", first.kwargs["system"][1]["text"])
        tool_result = second.kwargs["messages"][-1]["content"][0]
        self.assertEqual(tool_result["tool_use_id"], "toolu_1")
        self.assertEqual(json.loads(tool_result["content"])["places"][0]["description"], "Горное озеро.")

    def test_refusal(self):
        with mock.patch("anthropic.Anthropic") as client_class:
            client_class.return_value.beta.messages.create.return_value = SimpleNamespace(stop_reason="refusal", content=[])
            response = self.ask()
        self.assertEqual(response.json(), {"reply": "", "refused": True, "truncated": False})

    def test_bad_key(self):
        request = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
        error = anthropic.AuthenticationError("invalid x-api-key", response=httpx2.Response(401, request=request), body=None)
        with mock.patch("anthropic.Anthropic") as client_class:
            client_class.return_value.beta.messages.create.side_effect = error
            response = self.ask()
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["code"], "not_configured")
