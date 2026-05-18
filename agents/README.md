# agents/

> **This entire directory belongs to the AI/RAG lead (friend's scope).**

This folder contains the **conversational agents** that sit on top of the core NyayaSatya AI services — a voice agent (Vapi) and a WhatsApp bot (Twilio / Meta Cloud API).

Both agents call the same backend FastAPI endpoints as the web frontend.  
**Do NOT duplicate AI logic here — call `/api/v1/query` instead.**

---

## Directory Structure

```
agents/
├── vapi_voice/          ← Vapi.ai voice agent for phone-based legal queries
│   ├── handler.py       ← Webhook handler (receives Vapi call events)
│   ├── config.py        ← Vapi API keys, assistant config
│   ├── prompts.py       ← System prompts for the voice assistant
│   └── README.md
│
└── whatsapp_bot/        ← WhatsApp bot via Twilio / Meta Cloud API
    ├── handler.py       ← Webhook handler (receives WhatsApp messages)
    ├── config.py        ← Twilio / Meta credentials
    ├── templates.py     ← WhatsApp message templates (HSM)
    └── README.md
```

---

## How They Connect to the Backend

```
User calls phone number (Vapi)
        ↓
Vapi webhook → agents/vapi_voice/handler.py
        ↓
POST http://backend/api/v1/query  { mode: "fast", query: "...", language: "hi" }
        ↓
Backend → FastModeService.stream() → SSE tokens
        ↓
handler.py assembles response → Vapi TTS reads it aloud
```

```
User sends WhatsApp message
        ↓
Twilio/Meta webhook → agents/whatsapp_bot/handler.py
        ↓
POST http://backend/api/v1/query  { mode: "fast", query: "...", language: detected }
        ↓
handler.py → sends reply via Twilio/Meta API
```

---

## Environment Variables Needed

```env
# Vapi
VAPI_API_KEY=
VAPI_PHONE_NUMBER_ID=
VAPI_ASSISTANT_ID=

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# OR WhatsApp (Meta Cloud API)
META_WHATSAPP_TOKEN=
META_PHONE_NUMBER_ID=
META_VERIFY_TOKEN=

# Backend
BACKEND_API_URL=https://nyayasatya-api.railway.app
BACKEND_API_KEY=   # internal service key
```

---

## Deploy

Both agents can be deployed as separate Railway services or as FastAPI routers mounted on the main backend.  
Coordinate with backend lead on which approach.
