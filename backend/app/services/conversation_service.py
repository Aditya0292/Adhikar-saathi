import json
import uuid
import base64
import httpx
import logging
from datetime import datetime
from typing import Optional, List, Literal, Dict, Any
from pydantic import BaseModel, Field

from app.config import settings
from app.utils.redis_client import redis_client
from app.services import voice_service
from app.services.adviser_persona import LANGUAGE_PERSONA_MAP
from app.utils.speech_preprocessor import preprocess_for_speech

logger = logging.getLogger("conversation_service")

class ConversationTurn(BaseModel):
    role: Literal["user", "adviser"]
    text: str
    audio_path: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class ConversationSession(BaseModel):
    session_id: str
    user_auth_id: Optional[str] = None
    language: str
    scenario_type: Optional[str] = None
    turns: List[ConversationTurn] = []
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    last_active: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    suggest_lawyer: bool = False

async def get_session(session_id: str) -> Optional[ConversationSession]:
    data = await redis_client.get(f"session:{session_id}")
    if not data:
        return None
    try:
        return ConversationSession.model_validate_json(data)
    except Exception as e:
        logger.error(f"Failed to parse session {session_id}: {e}")
        return None

async def save_session(session: ConversationSession) -> None:
    session.last_active = datetime.utcnow().isoformat()
    await redis_client.setex(
        f"session:{session.session_id}",
        1800,  # 30 minutes TTL
        session.model_dump_json()
    )

async def delete_session(session_id: str) -> None:
    await redis_client.delete(f"session:{session_id}")

async def get_or_create_cached_greeting(language: str) -> bytes:
    lang = language.lower().split("-")[0]
    redis_key = f"greeting_audio:{lang}"
    
    # Try fetching from Redis cache
    cached_b64 = await redis_client.get(redis_key)
    if cached_b64:
        try:
            return base64.b64decode(cached_b64.encode('utf-8'))
        except Exception as e:
            logger.error(f"Failed to decode cached greeting: {e}")

    # Generate greeting text
    if lang == "hi" or lang == "ta":
        greeting_text = "नमस्ते, मैं न्याय हूँ। आज आपकी क्या सहायता कर सकता हूँ?"
    else:
        greeting_text = "Hello, I'm Nyaya, your legal adviser. What can I help you with today?"

    # Generate speech audio bytes
    try:
        audio_bytes = await voice_service.generate_speech(greeting_text, lang)
    except Exception as e:
        logger.warning(f"ElevenLabs TTS failed for greeting, using empty bytes placeholder: {e}")
        audio_bytes = b""

    # Cache in Redis as Base64 string
    if audio_bytes:
        b64_str = base64.b64encode(audio_bytes).decode('utf-8')
        await redis_client.set(redis_key, b64_str)
        
    return audio_bytes

async def call_llm(messages: List[Dict[str, str]], system_prompt: str, max_tokens: int = 1000) -> str:
    """
    Sends the conversational turn to Claude (Anthropic) if keys are present,
    otherwise falls back to OpenAI GPT-4o-mini. Returns the generated response.
    """
    # 1. Try Anthropic Claude
    if settings.anthropic_api_key:
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "x-api-key": settings.anthropic_api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                }
                # Translate OpenAI messages format to Anthropic format
                anthropic_messages = []
                for msg in messages:
                    if msg["role"] in ["user", "assistant"]:
                        anthropic_messages.append({"role": msg["role"], "content": msg["content"]})
                
                body = {
                    "model": "claude-3-haiku-20240307",
                    "max_tokens": max_tokens,
                    "system": system_prompt,
                    "messages": anthropic_messages
                }
                res = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=body, timeout=20.0)
                res.raise_for_status()
                result = res.json()
                return result["content"][0]["text"]
        except Exception as e:
            logger.error(f"Claude request failed: {e}. Falling back to OpenAI.")

    # 2. Try OpenAI GPT-4o-mini
    if settings.openai_api_key:
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json"
                }
                openai_messages = [{"role": "system", "content": system_prompt}] + messages
                body = {
                    "model": "gpt-4o-mini",
                    "messages": openai_messages,
                    "max_tokens": max_tokens,
                    "temperature": 0.7
                }
                res = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=body, timeout=20.0)
                res.raise_for_status()
                result = res.json()
                return result["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"OpenAI request failed: {e}")

    # 3. Fallback mock responses
    return "I am here to guide you with your legal query. Under Indian Law, you have rights to fair procedure and safety. Please consult a legal professional for specific filings."

async def classify_scenario(query_text: str) -> str:
    """
    Lightweight classification call to classify:
    arrest | domestic_violence | employment | property | consumer | general
    """
    system_prompt = (
        "You are an expert Indian legal query classifier. Classify the user query into exactly "
        "one of these categories: arrest, domestic_violence, employment, property, consumer, general. "
        "Respond with ONLY the lowercased category name. Do not include any explanation or punctuation."
    )
    messages = [{"role": "user", "content": query_text}]
    
    try:
        category = await call_llm(messages, system_prompt, max_tokens=30)
        category_clean = category.strip().lower()
        valid_scenarios = ["arrest", "domestic_violence", "employment", "property", "consumer", "general"]
        for scen in valid_scenarios:
            if scen in category_clean:
                return scen
        return "general"
    except Exception as e:
        logger.error(f"Scenario classification failed: {e}")
        return "general"
