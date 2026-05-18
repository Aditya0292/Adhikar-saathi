# Vapi Voice Agent

> **Friend's scope** — phone-based legal query agent using [Vapi.ai](https://vapi.ai)

## What This Does

Lets users in rural India call a phone number, speak their legal question in any Indian language, and hear the answer read aloud via TTS — no smartphone app needed.

## Flow

```
User calls Vapi phone number
    ↓
Vapi transcribes speech → sends webhook to this handler
    ↓
handler.py detects language → calls backend /api/v1/query (fast mode)
    ↓
Streams response tokens → assembles full answer
    ↓
Vapi reads answer aloud via TTS (Hindi/Tamil/Telugu etc.)
    ↓
If user asks "find me a lawyer" → reads nearest 3 lawyers from /api/v1/lawyers/search
```

## Files

| File | Purpose |
|------|---------|
| `handler.py` | FastAPI/Flask webhook — receives Vapi call events, calls backend |
| `config.py` | Vapi credentials, assistant ID, phone number config |
| `prompts.py` | System prompt for the Vapi assistant (language detection, legal context) |

## Setup

1. Create assistant at [vapi.ai/dashboard](https://vapi.ai/dashboard)
2. Set webhook URL to `https://your-agent-url/vapi/webhook`
3. Set env vars (see `agents/README.md`)
4. Deploy alongside or separate from main backend

## Interface Contract with Backend

```python
# This handler calls:
POST /api/v1/query
{
    "query": "मुझे किरायेदार से कैसे निपटना चाहिए?",
    "language": "hi",
    "mode": "fast",
    "session_id": "vapi-call-{call_id}"
}
# Returns: { "answer": "...", "needs_lawyer": bool, "latency_ms": int }
```
