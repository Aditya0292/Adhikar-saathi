import httpx
import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger("voice_service")

INDIAN_LANGUAGES = ["hi", "ta", "te", "bn", "mr", "gu", "kn", "ml", "pa"]

async def transcribe_audio(audio_bytes: bytes, language_code: Optional[str] = None) -> dict:
    """
    Transcribe audio bytes to text.
    If the language is a regional Indian language, uses Sarvam AI (saaras:v3).
    Otherwise falls back to OpenAI Whisper.
    If API keys are missing or external APIs fail, uses mock fallback.
    """
    lang = language_code.lower() if language_code else "en"
    lang_prefix = lang.split("-")[0]

    # Check keys. If missing, return mock transcription to allow testing
    if not settings.sarvam_api_key and not settings.openai_api_key:
        logger.warning("No voice transcription keys configured. Using mock fallback.")
        return _get_mock_transcription(lang_prefix)

    if lang_prefix in INDIAN_LANGUAGES:
        if settings.sarvam_api_key:
            try:
                return await _sarvam_transcribe(audio_bytes, lang_prefix)
            except Exception as e:
                logger.error(f"Sarvam failed: {e}. Trying Whisper fallback.")
                if settings.openai_api_key:
                    try:
                        return await _whisper_transcribe(audio_bytes)
                    except Exception as we:
                        logger.error(f"Whisper fallback failed: {we}. Using mock fallback.")
                        return _get_mock_transcription(lang_prefix)
                else:
                    return _get_mock_transcription(lang_prefix)
        elif settings.openai_api_key:
            try:
                return await _whisper_transcribe(audio_bytes)
            except Exception as e:
                logger.error(f"Whisper failed: {e}. Using mock fallback.")
                return _get_mock_transcription(lang_prefix)
    
    # English/fallback
    if settings.openai_api_key:
        try:
            return await _whisper_transcribe(audio_bytes)
        except Exception as e:
            logger.error(f"Whisper failed: {e}. Trying Sarvam English fallback.")
            if settings.sarvam_api_key:
                try:
                    return await _sarvam_transcribe(audio_bytes, "en")
                except Exception as se:
                    logger.error(f"Sarvam English fallback failed: {se}. Using mock fallback.")
                    return _get_mock_transcription(lang_prefix)
            else:
                return _get_mock_transcription(lang_prefix)
    elif settings.sarvam_api_key:
        try:
            return await _sarvam_transcribe(audio_bytes, "en")
        except Exception as e:
            logger.error(f"Sarvam failed: {e}. Using mock fallback.")
            return _get_mock_transcription(lang_prefix)
        
    return _get_mock_transcription(lang_prefix)

def _get_mock_transcription(lang_prefix: str) -> dict:
    if lang_prefix == "hi":
        text = "क्या मकान मालिक मुझे बिना नोटिस के घर से निकाल सकता है?"
    elif lang_prefix == "ta":
        text = "வீட்டு உரிமையாளர் என்னை முன்னறிவிப்பின்றி வெளியேற்ற முடியுமா?"
    else:
        text = "What are my rights regarding tenant eviction under Indian law?"
    
    return {
        "text": text,
        "lang": lang_prefix,
        "source": "mock"
    }

async def _sarvam_transcribe(audio_bytes: bytes, language_prefix: str) -> dict:
    # Sarvam AI API expects language_code in formats like "hi-IN", "ta-IN", etc.
    sarvam_lang = f"{language_prefix}-IN" if language_prefix != "en" else "en-IN"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.sarvam.ai/speech-to-text",
            headers={"api-subscription-key": settings.sarvam_api_key},
            files={"file": ("audio.wav", audio_bytes, "audio/wav")},
            data={
                "model": "saaras:v3",
                "language_code": sarvam_lang,
                "with_timestamps": "false",
            },
            timeout=15.0
        )
        response.raise_for_status()
        data = response.json()
        return {
            "text": data.get("transcript", ""),
            "lang": language_prefix,
            "source": "sarvam"
        }

async def _whisper_transcribe(audio_bytes: bytes) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            files={"file": ("audio.webm", audio_bytes, "audio/webm")},
            data={
                "model": "whisper-1",
                "response_format": "json"
            },
            timeout=15.0
        )
        response.raise_for_status()
        data = response.json()
        return {
            "text": data.get("text", ""),
            "lang": "en",
            "source": "whisper"
        }

async def _sarvam_generate_speech(text: str, language_prefix: str) -> bytes:
    if not settings.sarvam_api_key:
        raise ValueError("NO_SARVAM_KEY")
        
    sarvam_lang = f"{language_prefix}-IN" if language_prefix != "en" else "en-IN"
    
    # Speaker options: 'lata', 'raju', etc.
    # Lata is a natural, clear female advocate-like voice.
    speaker = "lata"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.sarvam.ai/text-to-speech",
            headers={
                "api-subscription-key": settings.sarvam_api_key,
                "Content-Type": "application/json"
            },
            json={
                "inputs": [text],
                "target_language_code": sarvam_lang,
                "speaker": speaker,
                "pace": 1.0,
                "speech_sample_rate": 22050,
                "enable_preamble": False,
                "model": "bulbul:v3"
            },
            timeout=20.0
        )
        response.raise_for_status()
        data = response.json()
        audios = data.get("audios", [])
        if not audios:
            raise ValueError("No audio content in Sarvam TTS response")
            
        import base64
        audio_bytes = base64.b64decode(audios[0])
        return audio_bytes

async def generate_speech(text: str, language_code: str) -> bytes:
    """
    Synthesize text into speech.
    If language is a regional Indian language (Hindi, Tamil, etc.), we prefer Sarvam AI TTS (bulbul:v1)
    as it sounds highly natural and human-like for Indic languages.
    Otherwise, we use ElevenLabs, falling back to Sarvam AI if ElevenLabs fails/is unpaid.
    """
    lang_prefix = language_code.lower().split("-")[0]
    
    # 1. For Indic languages, prefer Sarvam AI TTS (super natural Indic pronunciation)
    if lang_prefix in INDIAN_LANGUAGES and settings.sarvam_api_key:
        try:
            return await _sarvam_generate_speech(text, lang_prefix)
        except Exception as e:
            logger.error(f"Sarvam Indic TTS failed: {e}. Trying ElevenLabs fallback.")

    # 2. Try ElevenLabs
    if settings.elevenlabs_api_key:
        try:
            # ElevenLabs Voice mappings: Meera for Hindi, Priya for Tamil, Rachel for English / default
            voice_mappings = {
                "hi": "z9fAnwCtxzhYpW8Z96r1", # Meera
                "ta": "SOYHLrjzK2a1mZ3XT4LN", # Priya
                "en": "21m00Tcm4TlvDq8ikWAM"  # Rachel
            }
            voice_id = voice_mappings.get(lang_prefix, voice_mappings["en"])
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    headers={
                        "xi-api-key": settings.elevenlabs_api_key,
                        "Content-Type": "application/json"
                    },
                    json={
                        "text": text,
                        "model_id": "eleven_multilingual_v2",
                        "voice_settings": {
                            "stability": 0.5,
                            "similarity_boost": 0.75
                        }
                    },
                    timeout=20.0
                )
                response.raise_for_status()
                return response.content
        except Exception as e:
            logger.error(f"ElevenLabs TTS failed: {e}. Trying Sarvam fallback.")

    # 3. Fallback to Sarvam AI TTS for English/other languages if ElevenLabs failed
    if settings.sarvam_api_key:
        try:
            return await _sarvam_generate_speech(text, lang_prefix)
        except Exception as e:
            logger.error(f"Sarvam fallback TTS failed: {e}")

    raise ValueError("No active TTS engines available")
