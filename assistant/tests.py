import json
from types import SimpleNamespace
from unittest import mock

import anthropic
import httpx2
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase

from places.models import Place, Region

URL = "/api/assistant/"


def text_response(text):
    return SimpleNamespace(stop_reason="end_turn", content=[SimpleNamespace(type="text", text=text)])


def tool_response(name, tool_input):
    return SimpleNamespace(
        stop_reason="tool_use",
        content=[SimpleNamespace(type="tool_use", id="toolu_1", name=name, input=tool_input)],
    )


@override_settings(ANTHROPIC_API_KEY="test-key")
class AssistantTests(APITestCase):
    def setUp(self):
        cache.clear()  # throttling counters
        region = Region.objects.create(name="Согдийская область")
        self.place = Place.objects.create(region=region, name="Искандеркуль", name_en="Iskanderkul", description="Горное озеро.")

    def ask(self, text="Расскажи про Искандеркуль"):
        return self.client.post(URL, {"messages": [{"role": "user", "content": text}]}, format="json")

    @override_settings(ANTHROPIC_API_KEY="")
    def test_not_configured(self):
        self.assertEqual(self.client.get(URL).json(), {"enabled": False})
        response = self.ask()
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["code"], "not_configured")

    def test_catalog_and_tool_loop(self):
        with mock.patch("assistant.views.anthropic.Anthropic") as client_class:
            create = client_class.return_value.beta.messages.create
            create.side_effect = [
                tool_response("get_place_details", {"place_ids": [self.place.id]}),
                text_response(f"[Искандеркуль](/places/{self.place.id}) — горное озеро."),
            ]
            response = self.ask()

        self.assertEqual(response.status_code, 200)
        self.assertIn(f"/places/{self.place.id}", response.json()["reply"])
        first, second = create.call_args_list
        # The catalog of places is in the cached system prompt, the visitor's language after it.
        self.assertIn(f"{self.place.id} | Искандеркуль | Iskanderkul", first.kwargs["system"][0]["text"])
        self.assertEqual(first.kwargs["system"][0]["cache_control"], {"type": "ephemeral"})
        self.assertIn("Russian", first.kwargs["system"][1]["text"])
        # The tool result with the place details was sent back to the model.
        tool_result = second.kwargs["messages"][-1]["content"][0]
        self.assertEqual(tool_result["tool_use_id"], "toolu_1")
        self.assertFalse(tool_result["is_error"])
        self.assertEqual(json.loads(tool_result["content"])["places"][0]["description"], "Горное озеро.")

    def test_refusal(self):
        with mock.patch("assistant.views.anthropic.Anthropic") as client_class:
            client_class.return_value.beta.messages.create.return_value = SimpleNamespace(stop_reason="refusal", content=[])
            response = self.ask()
        self.assertEqual(response.json(), {"reply": "", "refused": True})

    def test_bad_key(self):
        request = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
        error = anthropic.AuthenticationError("invalid x-api-key", response=httpx2.Response(401, request=request), body=None)
        with mock.patch("assistant.views.anthropic.Anthropic") as client_class:
            client_class.return_value.beta.messages.create.side_effect = error
            response = self.ask()
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["code"], "not_configured")

    def test_last_message_must_be_from_user(self):
        response = self.client.post(URL, {"messages": [{"role": "assistant", "content": "Салом"}]}, format="json")
        self.assertEqual(response.status_code, 400)
