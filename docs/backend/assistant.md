# `assistant/` — AI assistant

An AI chat that knows every place, region and public route on the site and how the site works.
It has **no models**; it reads data from `places`.

| File | Purpose |
|---|---|
| `apps.py` | `AssistantConfig` (verbose name "AI assistant") |
| `urls.py` | `""` → `AssistantView` (mounted at `/api/assistant/`) |
| `views.py` | Request validation, provider check, throttle, calling `ask()` |
| `knowledge.py` | Builds the system prompt: rules + site guide + live catalogue |
| `providers.py` | Talks to Google Gemini or Anthropic Claude, runs the tool-calling loop |
| `tools.py` | Tool definitions and implementations (`get_place_details`, `get_road_route`) |
| `tests.py` | Mocked tests for both providers |

## Flow

```
POST /api/assistant/ {messages:[{role, content}, …]}
  └─ ChatSerializer: keep last 20, drop leading assistant turns, last must be "user", ≤ 2000 chars
  └─ active_provider()  → "gemini" if GEMINI_API_KEY, "claude" if ANTHROPIC_API_KEY, else 503 not_configured
  └─ system_prompt()     (knowledge.py — rebuilt each request so new places are known)
  └─ visitor_note        "Site language of this visitor: Russian|Tajik|English" (from Accept-Language)
  └─ ask(system, note, messages)  (providers.py)
        loop ≤ 6 times:
          model → text answer?           → return {reply, refused, truncated}
          model → tool calls?            → run_tool() for each → send results back → repeat
```

## `views.py`
- `ChatMessageSerializer`: `role` ∈ {user, assistant}, `content` ≤ 4000 chars.
- `ChatSerializer.validate_messages`: trims history to `MAX_HISTORY = 20`, makes it start with a user message,
  requires the last one from the user and ≤ 2000 chars.
- `AssistantView` (AllowAny):
  - `GET` → `{"enabled": bool}` (not throttled).
  - `POST` → throttled with `ScopedRateThrottle` scope `assistant` (15/min) on top of the global throttles.
    Errors are returned as `{code, detail}` with the status from `AssistantError`.

## `knowledge.py`
- `INSTRUCTIONS` — how to answer: reply in the visitor's language (RU/TG/EN), short answers, limited Markdown,
  link places as `[Name](/places/12)` and routes as `[Title](/lists/3)` only, prefer catalogue places, call tools
  for details/distances instead of guessing, warn that prices/permits change, explain how to do things on the site.
- `SITE_GUIDE` — a description of every page and feature (search, sections, place page, account & email code rules,
  profile, reviews, routes, suggestions, notifications, roles).
- `_catalog_regions()`, `_catalog_places()` (table `id | name | en | tg | region | category | season | fee | rating`),
  `_catalog_routes()` (`id | title | A -> B -> C`).
- `system_prompt()` joins them. Ordered by id, no timestamps → text is stable so the API can **cache** it.

## `tools.py`
| Tool | Input | Output |
|---|---|---|
| `get_place_details` | `place_ids` (≤ 5) | description, how to get there, address, altitude, season, fee, activities, coords, rating, 5 latest reviews; `not_found_ids` |
| `get_road_route` | `place_ids` (2–10, in order), `mode` car/foot/bike | `distance_km`, `duration_min`, `legs`, note. Uses `places.views.road_route` (OSRM + cache) |

`TOOLS` is in Anthropic's JSON-schema format (`strict: True`); for Gemini `additionalProperties` is stripped.
`run_tool(name, input)` → `(json_text, is_error)`.

## `providers.py`
- `AssistantError(code, detail, http_status)` and presets `NOT_CONFIGURED` (503), `BUSY` (429), `UNAVAILABLE`
  (503), `TOO_LONG` (502).
- `MAX_TOOL_STEPS = 6`, `GEMINI_TIMEOUT_MS = 25 000`.

### Gemini (`_ask_gemini`, `_gemini_answer`)
- `genai.Client` with 25 s timeout and **no internal retries** (1 attempt).
- `GenerateContentConfig`: system instruction, function declarations, automatic function calling disabled,
  `max_output_tokens=8192`.
- Tries `GEMINI_MODEL` then each `GEMINI_FALLBACK_MODELS` on 404/429/500/503/504 or timeout; 401/403/"API key" →
  `not_configured`. Each model starts the answer from scratch (thought signatures are per model).
- Tool loop: append the model's content unchanged, then a user turn with `FunctionResponse(id, name, response)`.
- Blocked answer (no candidate) or SAFETY/PROHIBITED finish → `refused: True`; `MAX_TOKENS` → `truncated: True`.

### Claude (`_ask_claude`)
- `anthropic.Anthropic(timeout=120, max_retries=2)`, `client.beta.messages.create(...)` with
  `model=ASSISTANT_MODEL`, `max_tokens=16000`, `thinking={"type": "adaptive"}`,
  `output_config={"effort": ASSISTANT_EFFORT}`, tools, beta `server-side-fallback-2026-07-01`.
- System = two blocks: the big stable prompt with `cache_control: ephemeral` (**prompt caching**) + the visitor note.
- `stop_reason == "refusal"` → refused; `tool_use`/`pause_turn` → run tools, send `tool_result`s, loop;
  otherwise join text blocks.
- Maps `AuthenticationError`, `RateLimitError`, `BadRequestError`, `APIStatusError`/`APIConnectionError` to
  `AssistantError`s.

## `tests.py`
- Not configured → `GET` says disabled, `POST` 503; last message must be from the user (400).
- Gemini: catalogue present in the system instruction, tool loop sends back the result with the same call id,
  overloaded model falls back to the next one, quota (429) → `busy`, bad key → `not_configured`.
- Claude: catalogue in the cached system block, tool result with `tool_use_id`, refusal, bad key.
All SDK calls are mocked with `unittest.mock.patch`.
