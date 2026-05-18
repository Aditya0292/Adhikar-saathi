# WhatsApp Bot

> **Friend's scope** — WhatsApp-based legal query bot via Twilio or Meta Cloud API

## What This Does

Lets users send their legal question on WhatsApp (the most-used app in India) and get an AI answer back — supports Hindi, Tamil, Telugu and 7 other Indian languages.

## Flow

```
User sends WhatsApp message: "मेरे मकान मालिक ने बिना नोटिस दिए निकाल दिया"
    ↓
Twilio/Meta webhook → handler.py
    ↓
handler.py detects language → calls backend /api/v1/query (fast mode)
    ↓
Formats reply (WhatsApp markdown: *bold*, _italic_)
    ↓
Sends back via Twilio/Meta API (max 1600 chars per message — split if needed)
    ↓
If needs_lawyer=true → sends follow-up: "Want me to find a verified lawyer near you?"
    ↓
User replies "yes" + shares location → calls /api/v1/lawyers/search?lat=&lon=&radius=25
    ↓
Sends top 3 lawyers as WhatsApp contacts/cards
```

## Files

| File | Purpose |
|------|---------|
| `handler.py` | Webhook handler — parse incoming message, call backend, send reply |
| `config.py` | Twilio / Meta Cloud API credentials |
| `templates.py` | Pre-approved WhatsApp HSM templates (for proactive messages) |

## Interface Contract with Backend

```python
# This handler calls:
POST /api/v1/query
{
    "query": "user's message text",
    "language": "hi",  # auto-detected or from user preference
    "mode": "fast",
    "session_id": "whatsapp-{phone_number_hash}"
}

# Lawyer search:
GET /api/v1/lawyers/search?lat=19.076&lon=72.877&radius_km=25&specialisation=civil&limit=3
```

## WhatsApp Character Limits

- Max message: 1600 characters
- If answer > 1600 chars: split into multiple messages with `(1/2)`, `(2/2)` suffix
- Citations: send as separate follow-up message in smaller font via `_source_` formatting
