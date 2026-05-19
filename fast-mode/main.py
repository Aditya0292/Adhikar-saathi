from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict
import os
import time
import math
import httpx
from collections import deque
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY not set in environment or .env file")

client = Groq(api_key=GROQ_API_KEY)

app = FastAPI(title="NyayaSatya Fast Mode")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

RATE_LIMIT = 20
RATE_PERIOD = 60
rate_store: Dict[str, deque] = {}


# ─── MODELS ───────────────────────────────────────────────

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[Message] = []

class NearbyRequest(BaseModel):
    lat: float
    lng: float
    intent: str


# ─── SYSTEM PROMPTS ───────────────────────────────────────

SYSTEM_PROMPT = """
You are NyayaSatya, an AI legal awareness assistant specializing
exclusively in Indian law. Your purpose is to educate Indian citizens
about their legal rights, applicable laws, consequences of crimes,
and legal procedures in simple, clear language.

STRICT RULES YOU MUST FOLLOW:

1. ONLY answer questions related to Indian law, legal rights, crimes,
   legal procedures, courts, police, consumer rights, property law,
   family law, labour law, constitutional rights, or any topic
   involving the Indian legal system.

2. If a user asks ANYTHING outside Indian legal topics respond with:
   "I can only assist with questions related to Indian law and legal
   matters. Please ask me about your legal rights, applicable laws,
   or legal procedures in India."

3. NEVER make up laws, sections, or case names. If unsure say:
   "I am not certain of the exact section — please verify with a
   legal professional or on Indian Kanoon."

4. ALWAYS end every response with this disclaimer on a new line:
   "⚠️ This is general legal information for awareness purposes only,
   not legal advice. For your specific situation, consult a qualified
   lawyer."

5. Structure responses clearly:
   - Direct answer first
   - Relevant law or act by name
   - Simple explanation
   - Consequences or rights
   - Practical next step

6. Maximum 250 words unless more detail is genuinely needed.

7. Respond in the same language the user uses (English/Hindi/Hinglish).

8. Be empathetic. Explain legal terms in brackets immediately.

9. Never ask for personal information.

10. If the situation sounds like an emergency (arrest, domestic
    violence, accident), start with "This sounds urgent." and give
    immediate actionable steps first.

11. INTENT CLASSIFICATION — After the disclaimer, add exactly:
    INTENT:none
    Replace "none" with:
    - "police"  → FIR, crime report, arrest, theft, assault, harassment
    - "legal"   → need lawyer, legal aid, court, advocate, consultation
    - "traffic" → vehicle, licence, RTO, challan, road accident, traffic
    - "none"    → everything else
    Do not explain this line. Just output it as the very last line.

Indian laws include but not limited to:
- Bharatiya Nyaya Sanhita 2023 (replaces IPC 1860)
- Bharatiya Nagarik Suraksha Sanhita 2023 (replaces CrPC 1973)
- Constitution of India (Fundamental Rights, Articles 12-35)
- Consumer Protection Act 2019
- Protection of Women from Domestic Violence Act 2005
- POCSO Act 2012, RTI Act 2005, Motor Vehicles Act 1988
- IT Act 2000, POSH Act 2013, Transfer of Property Act 1882
- Hindu Marriage Act 1955, Special Marriage Act 1954
- SC/ST (Prevention of Atrocities) Act 1989
- Legal Services Authorities Act 1987 (free legal aid)
"""

VAPI_SYSTEM_PROMPT = """
You are NyayaSatya, an emergency legal guidance assistant for Indian
citizens. You are on a VOICE CALL with someone who needs urgent help.

RULES:
1. Max 4 sentences per response. This is a voice call.
2. No bullet points, no lists, no markdown. Speak naturally.
3. Only Indian law topics.
4. ARREST: Article 22 — right to know grounds, right to lawyer,
   right to inform family. Do not sign anything without a lawyer.
5. DOMESTIC VIOLENCE: PWDVA 2005, call 181 or 112.
6. ROAD ACCIDENT: Do not flee, call 112, Motor Vehicles Act 1988.
7. HARASSMENT/STALKING: BNS Section 78, file FIR immediately.
8. End with ONE clear action step.
9. Match the user's language.
10. No emojis, no special characters, no disclaimers on voice calls.
"""


# ─── RATE LIMITING ────────────────────────────────────────

def check_rate_limit(ip: str) -> None:
    now = time.time()
    dq = rate_store.get(ip)
    if dq is None:
        dq = deque()
        rate_store[ip] = dq
    while dq and now - dq[0] > RATE_PERIOD:
        dq.popleft()
    if len(dq) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many requests. Please wait.")
    dq.append(now)


# ─── STATIC FILES ─────────────────────────────────────────

@app.get("/")
async def serve_index():
    path = os.path.join(os.path.dirname(__file__), "index.html")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="index.html not found")
    return FileResponse(path, media_type="text/html")


# ─── /chat ────────────────────────────────────────────────

@app.post("/chat")
async def chat_endpoint(req: Request, body: ChatRequest):
    check_rate_limit(req.client.host if req.client else "unknown")

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in body.history[-12:]:
        messages.append({
            "role": "user" if msg.role == "user" else "assistant",
            "content": msg.content
        })
    messages.append({"role": "user", "content": body.message})

    try:
        chat = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=1024,
            temperature=0.3,
        )
        text = chat.choices[0].message.content
        if not text:
            return {"response": "I'm having trouble connecting right now.", "intent": "none"}

        intent = "none"
        clean_lines = []
        for line in text.strip().split("\n"):
            if line.strip().startswith("INTENT:"):
                intent = line.strip().replace("INTENT:", "").strip().lower()
            else:
                clean_lines.append(line)

        return {"response": "\n".join(clean_lines).strip(), "intent": intent}

    except Exception as e:
        print(f"Groq /chat error: {e}")
        return {"response": "I'm having trouble connecting right now.", "intent": "none"}


# ─── /nearby ──────────────────────────────────────────────

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

INTENT_CONFIG = {
    "police": {
        "queries": ['["amenity"="police"]'],
        "label": "Police Station",
        "emoji": "🚔",
        "gmaps_search": "police station near me"
    },
    "legal": {
        "queries": [
            '["amenity"="courthouse"]',
            '["amenity"="lawyer"]',
            '["office"="lawyer"]',
            '["amenity"="legal_aid"]',
            '["office"="legal_aid"]'
        ],
        "label": "Legal Office / Court",
        "emoji": "⚖️",
        "gmaps_search": "legal aid office lawyer court near me"
    },
    "traffic": {
        "queries": [
            '["office"="government"]["name"~"RTO|Regional Transport",i]',
            '["name"~"RTO|Regional Transport Office",i]'
        ],
        "label": "RTO Office",
        "emoji": "🚗",
        "gmaps_search": "RTO Regional Transport Office near me"
    }
}


def haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlng / 2) ** 2)
    return round(R * 2 * math.asin(math.sqrt(a)), 1)


@app.post("/nearby")
async def nearby_endpoint(body: NearbyRequest):
    intent = body.intent.lower()
    if intent not in INTENT_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid intent")

    cfg = INTENT_CONFIG[intent]
    radius = 8000  # 8km for Indian cities

    # Build union of all queries
    node_ways = ""
    for q in cfg["queries"]:
        node_ways += f'node{q}(around:{radius},{body.lat},{body.lng});\n'
        node_ways += f'way{q}(around:{radius},{body.lat},{body.lng});\n'

    query = f"[out:json][timeout:20];\n(\n{node_ways});\nout center 10;"

    try:
        async with httpx.AsyncClient(timeout=25) as hc:
            resp = await hc.post(OVERPASS_URL, data={"data": query})
            data = resp.json()

        results = []
        seen = set()
        for el in data.get("elements", []):
            tags = el.get("tags", {})
            name = tags.get("name") or tags.get("name:en") or cfg["label"]
            if el["type"] == "node":
                lat, lng = el.get("lat"), el.get("lon")
            else:
                c = el.get("center", {})
                lat, lng = c.get("lat"), c.get("lon")
            if not lat or not lng:
                continue
            key = f"{round(lat,4)},{round(lng,4)}"
            if key in seen:
                continue
            seen.add(key)

            dist = haversine(body.lat, body.lng, lat, lng)
            # Google Maps link — clicking name opens directions
            maps_url = f"https://www.google.com/maps/search/?api=1&query={lat},{lng}"
            directions_url = f"https://www.google.com/maps/dir/?api=1&destination={lat},{lng}"

            results.append({
                "name": name,
                "distance_km": dist,
                "maps_url": maps_url,
                "directions_url": directions_url
            })

        results.sort(key=lambda x: x["distance_km"])

        # Google Maps search URL as fallback (opens search results on Maps)
        gmaps_search_url = (
            f"https://www.google.com/maps/search/{cfg['gmaps_search'].replace(' ', '+')}/"
            f"@{body.lat},{body.lng},14z"
        )

        return {
            "emoji": cfg["emoji"],
            "label": cfg["label"],
            "places": results[:5],
            "gmaps_search_url": gmaps_search_url
        }

    except Exception as e:
        print(f"Overpass error: {e}")
        gmaps_search_url = (
            f"https://www.google.com/maps/search/{cfg['gmaps_search'].replace(' ', '+')}/"
            f"@{body.lat},{body.lng},14z"
        )
        return {
            "emoji": cfg["emoji"],
            "label": cfg["label"],
            "places": [],
            "gmaps_search_url": gmaps_search_url
        }


# ─── /vapi-chat ───────────────────────────────────────────

@app.post("/vapi-chat")
async def vapi_chat_endpoint(req: Request):
    try:
        body = await req.json()
    except Exception:
        return {"content": "I did not catch that. Please describe your situation."}

    messages_raw = body.get("messages", [])
    user_message = ""
    for msg in reversed(messages_raw):
        if msg.get("role") == "user":
            user_message = msg.get("content", "").strip()
            break

    if not user_message:
        return {"content": "Please describe your legal situation. I am here to help."}

    groq_messages = [{"role": "system", "content": VAPI_SYSTEM_PROMPT}]
    for msg in messages_raw[-6:]:
        role = msg.get("role", "")
        content = msg.get("content", "").strip()
        if role in ("user", "assistant") and content:
            groq_messages.append({"role": role, "content": content})

    try:
        chat = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=groq_messages,
            max_tokens=200,
            temperature=0.3,
        )
        text = chat.choices[0].message.content
        return {"content": text or "Please call 112 for immediate help."}
    except Exception as e:
        print(f"Groq /vapi-chat error: {e}")
        return {"content": "Please call 112 for immediate help."}


# ─── /health ──────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": "llama-3.3-70b-versatile",
        "endpoints": ["/", "/chat", "/nearby", "/vapi-chat", "/health"]
    }