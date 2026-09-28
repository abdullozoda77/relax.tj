"""The AI models behind the assistant.

Google Gemini is used when GEMINI_API_KEY is set (it has a free tier), otherwise Claude with ANTHROPIC_API_KEY.
Both get the same instructions and catalog and can call the same tools (place details, road routes).
"""
import json
import logging

from django.conf import settings

from .tools import TOOLS, run_tool

logger = logging.getLogger(__name__)

MAX_TOOL_STEPS = 6  # model calls per answer (each tool round is one more call)


class AssistantError(Exception):
    def __init__(self, code, detail, http_status):
        super().__init__(detail)
        self.code = code
        self.detail = detail
        self.http_status = http_status


NOT_CONFIGURED = ("not_configured", "The AI assistant key is not valid.", 503)
BUSY = ("busy", "The AI assistant is busy. Try again in a minute.", 429)
UNAVAILABLE = ("unavailable", "The AI assistant is not available right now.", 503)
TOO_LONG = ("too_long", "The question needed too many steps. Try asking it more simply.", 502)


def active_provider():
    if settings.GEMINI_API_KEY:
        return "gemini"
    if settings.ANTHROPIC_API_KEY:
        return "claude"
    return None


def ask(system_text, visitor_note, messages):
    """messages: [{"role": "user" | "assistant", "content": text}], the last one from the user.
    Returns {"reply": text, "refused": bool, "truncated": bool}; raises AssistantError."""
    if active_provider() == "gemini":
        return _ask_gemini(system_text, visitor_note, messages)
    return _ask_claude(system_text, visitor_note, messages)


# --- Google Gemini ---------------------------------------------------------------------------------------------

def _ask_gemini(system_text, visitor_note, messages):
    import httpx
    from google import genai
    from google.genai import errors, types

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    config = types.GenerateContentConfig(
        system_instruction=f"{system_text}\n{visitor_note}",
        tools=[types.Tool(function_declarations=[
            types.FunctionDeclaration(
                name=tool["name"],
                description=tool["description"],
                parameters_json_schema={k: v for k, v in tool["input_schema"].items() if k != "additionalProperties"},
            )
            for tool in TOOLS
        ])],
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
        max_output_tokens=8192,
    )
    contents = [
        types.Content(role="user" if m["role"] == "user" else "model", parts=[types.Part.from_text(text=m["content"])])
        for m in messages
    ]

    for _ in range(MAX_TOOL_STEPS):
        try:
            response = client.models.generate_content(model=settings.GEMINI_MODEL, contents=contents, config=config)
        except errors.APIError as e:
            logger.warning("AI assistant (Gemini): %s %s", e.code, e.message)
            if e.code in (401, 403) or (e.code == 400 and "API key" in (e.message or "")):
                raise AssistantError(*NOT_CONFIGURED)
            if e.code == 429:
                raise AssistantError(*BUSY)
            raise AssistantError(*UNAVAILABLE)
        except (httpx.HTTPError, OSError) as e:
            logger.warning("AI assistant (Gemini): network error: %s", e)
            raise AssistantError(*UNAVAILABLE)

        candidate = response.candidates[0] if response.candidates else None
        if candidate is None or candidate.content is None:
            return {"reply": "", "refused": True, "truncated": False}  # the question itself was blocked
        calls = response.function_calls or []
        if calls:
            # The model's turn goes back unchanged (it carries thought signatures), then the results.
            contents.append(candidate.content)
            parts = []
            for call in calls:
                text, _ = run_tool(call.name, dict(call.args or {}))
                # The id ties the result to its call when the model asks for several at once.
                parts.append(types.Part(function_response=types.FunctionResponse(id=call.id, name=call.name, response=json.loads(text))))
            contents.append(types.Content(role="tool", parts=parts))
            continue
        reply = (response.text or "").strip()
        finish = str(candidate.finish_reason or "")
        refused = not reply and any(word in finish for word in ("SAFETY", "PROHIBITED", "BLOCKLIST", "SPII"))
        return {"reply": reply, "refused": refused, "truncated": "MAX_TOKENS" in finish}
    raise AssistantError(*TOO_LONG)


# --- Claude ----------------------------------------------------------------------------------------------------

def _ask_claude(system_text, visitor_note, messages):
    import anthropic

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=120, max_retries=2)
    system = [
        # Instructions, site guide and catalog: the same for everyone, so the API caches them.
        {"type": "text", "text": system_text, "cache_control": {"type": "ephemeral"}},
        {"type": "text", "text": visitor_note},
    ]
    messages = list(messages)
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
                return {"reply": "", "refused": True, "truncated": False}
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
            return {"reply": reply, "refused": False, "truncated": response.stop_reason == "max_tokens"}
        raise AssistantError(*TOO_LONG)
    except anthropic.AuthenticationError:
        logger.error("AI assistant: the ANTHROPIC_API_KEY was rejected")
        raise AssistantError(*NOT_CONFIGURED)
    except anthropic.RateLimitError:
        raise AssistantError(*BUSY)
    except anthropic.BadRequestError as e:
        logger.error("AI assistant: bad request: %s", e.message)
        raise AssistantError("unavailable", "The AI assistant could not answer.", 502)
    except (anthropic.APIStatusError, anthropic.APIConnectionError) as e:
        logger.warning("AI assistant: API unavailable: %s", e)
        raise AssistantError(*UNAVAILABLE)
