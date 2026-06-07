from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import io
import uuid
import base64
import logging

from app.services import voice_service, conversation_service as conv_service
from app.utils.redis_client import redis_client
from app.dependencies import get_current_user
from app.supabase_client import get_service_client
from app.utils.speech_preprocessor import preprocess_for_speech
from app.services.adviser_persona import LANGUAGE_PERSONA_MAP
from app.config import settings

logger = logging.getLogger("voice_api")

LANG_MAP = {
    "en": "English",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "bn": "Bengali",
    "mr": "Marathi",
    "gu": "Gujarati",
    "kn": "Kannada",
    "ml": "Malayalam",
    "pa": "Punjabi",
    "or": "Odia"
}

router = APIRouter(prefix="/voice", tags=["Voice Engine"])

class TTSRequest(BaseModel):
    text: str
    language: str

class StartSessionRequest(BaseModel):
    language: str

@router.post("/transcribe")
async def transcribe_audio_endpoint(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None)
):
    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty audio file provided"
            )
            
        result = await voice_service.transcribe_audio(content, language)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Speech transcription failed: {str(e)}"
        )

@router.post("/tts")
async def text_to_speech_endpoint(request: TTSRequest):
    try:
        audio_content = await voice_service.generate_speech(request.text, request.language)
        return StreamingResponse(io.BytesIO(audio_content), media_type="audio/mpeg")
    except ValueError as ve:
        if str(ve) == "NO_TTS_KEY":
            raise HTTPException(
                status_code=status.HTTP_412_PRECONDITION_FAILED,
                detail="NO_TTS_KEY"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Text-to-speech generation failed: {str(e)}"
        )

# --- Conversational Voice Adviser Routes ---

SILENT_WAV_1S = b'RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x40\x1f\x00\x00\x40\x1f\x00\x00\x01\x00\x08\x00data\x00\x00\x00\x00'

@router.post("/session/start")
async def start_session(
    req_body: StartSessionRequest,
    user: Optional[dict] = Depends(get_current_user)
):
    try:
        session_id = str(uuid.uuid4())
        user_auth_id = user["sub"] if user else None
        
        # Cache / pre-warm greeting audio
        await conv_service.get_or_create_cached_greeting(req_body.language)
        
        session = conv_service.ConversationSession(
            session_id=session_id,
            user_auth_id=user_auth_id,
            language=req_body.language
        )
        await conv_service.save_session(session)
        
        return {
            "session_id": session_id,
            "greeting_audio_url": f"/api/v1/voice/session/greeting?language={req_body.language}"
        }
    except Exception as e:
        logger.error(f"Failed to start voice session: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize voice session")

@router.get("/session/greeting")
async def get_session_greeting(language: str = "en"):
    try:
        audio_bytes = await conv_service.get_or_create_cached_greeting(language)
        if not audio_bytes:
            return StreamingResponse(io.BytesIO(SILENT_WAV_1S), media_type="audio/wav")
        return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/mpeg")
    except Exception as e:
        logger.error(f"Failed to fetch greeting audio: {e}")
        return StreamingResponse(io.BytesIO(SILENT_WAV_1S), media_type="audio/wav")

@router.get("/audio/{audio_id}")
async def get_cached_audio(audio_id: str):
    try:
        b64_data = await redis_client.get(f"audio_cache:{audio_id}")
        if not b64_data:
            return StreamingResponse(io.BytesIO(SILENT_WAV_1S), media_type="audio/wav")
        audio_bytes = base64.b64decode(b64_data.encode('utf-8'))
        return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/mpeg")
    except Exception as e:
        logger.error(f"Failed to decode cached audio: {e}")
        return StreamingResponse(io.BytesIO(SILENT_WAV_1S), media_type="audio/wav")

@router.post("/session/{session_id}/turn")
async def process_session_turn(
    session_id: str,
    file: UploadFile = File(...)
):
    session = await conv_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Voice session not found or expired")
        
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty audio file provided")
            
        # 1. Transcribe audio (Sarvam/Whisper)
        transcription_res = await voice_service.transcribe_audio(content, session.language)
        user_text = transcription_res.get("text", "").strip()
        
        if not user_text:
            raise HTTPException(status_code=400, detail="Could not transcribe any speech from audio")
            
        # 2. Add user turn to session
        user_turn = conv_service.ConversationTurn(role="user", text=user_text)
        session.turns.append(user_turn)
        
        # 3. Scenario classification (if not yet detected)
        if not session.scenario_type:
            session.scenario_type = await conv_service.classify_scenario(user_text)
            
        # 4. Build messages array with history (trim older than last 6 turns)
        history_turns = session.turns[:-1] # Exclude current user turn which will be appended below
        trimmed_turns = history_turns[-6:] if len(history_turns) > 6 else history_turns
        
        messages = []
        for turn in trimmed_turns:
            role = "user" if turn.role == "user" else "assistant"
            messages.append({"role": role, "content": turn.text})
            
        # Append current user turn
        messages.append({"role": "user", "content": user_text})
        
        # Get language settings
        lang_prefix = session.language.lower().split("-")[0]
        lang_config = LANGUAGE_PERSONA_MAP.get(lang_prefix, LANGUAGE_PERSONA_MAP["en"])
        
        lang_name = LANG_MAP.get(lang_prefix, "English")
        system_prompt = lang_config["prompt"]
        system_prompt += f"\n\nCRITICAL: You MUST write your entire response only in {lang_name} language."
        if session.scenario_type:
            system_prompt += f"\nContext: This appears to be a {session.scenario_type} situation. Calibrate your tone accordingly."
            
        # 5. Call Claude / OpenAI
        adviser_response = await conv_service.call_llm(messages, system_prompt)
        
        # 6. Preprocess & Convert response to speech
        preprocessed_text = preprocess_for_speech(adviser_response, session.language)
        
        try:
            audio_bytes = await voice_service.generate_speech(preprocessed_text, session.language)
            audio_id = str(uuid.uuid4())
            # Cache audio bytes in Redis as Base64 with 10-min expiration
            b64_audio = base64.b64encode(audio_bytes).decode('utf-8')
            await redis_client.setex(f"audio_cache:{audio_id}", 600, b64_audio)
            audio_url = f"/api/v1/voice/audio/{audio_id}"
        except Exception as e:
            logger.error(f"ElevenLabs TTS failed in turn: {e}")
            audio_url = "" # Let the UI fallback if needed
            
        # 7. Add adviser turn to session
        adviser_turn = conv_service.ConversationTurn(role="adviser", text=adviser_response)
        session.turns.append(adviser_turn)
        
        # 8. Check for suggest lawyer
        if session.scenario_type in ["arrest", "domestic_violence"]:
            session.suggest_lawyer = True
        elif any(kw in adviser_response.lower() for kw in ["lawyer", "advocate", "consult", "legal representation"]):
            session.suggest_lawyer = True
            
        await conv_service.save_session(session)
        
        return {
            "transcript": user_text,
            "response_text": adviser_response,
            "audio_url": audio_url,
            "scenario_type": session.scenario_type,
            "suggest_lawyer": session.suggest_lawyer,
            "session_turn_count": len(session.turns)
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed processing voice turn: {e}")
        raise HTTPException(status_code=500, detail=f"Failed processing turn: {str(e)}")

@router.post("/session/{session_id}/end")
async def end_session(
    session_id: str,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None
):
    session = await conv_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
        
    try:
        # 1. Save full transcript to query_logs
        if session.turns:
            client = get_service_client()
            
            transcript_text = "\n".join([f"{t.role.capitalize()}: {t.text}" for t in session.turns])
            response_text = "\n".join([t.text for t in session.turns if t.role == "adviser"])
            
            insert_data = {
                "query_text": f"[Voice Session] {session.turns[0].text[:200] if session.turns else ''}",
                "response_text": response_text,
                "mode": "voice",
                "user_auth_id": session.user_auth_id,
            }
            # Add full transcript description in a metadata/notes field if the schema permits,
            # or prepend to query_text
            insert_data["query_text"] = f"[Voice Session {session_id}] {transcript_text[:1000]}"
            
            try:
                client.table("query_logs").insert(insert_data).execute()
            except Exception as dbe:
                logger.error(f"Failed to log query session to database: {dbe}")
                
        # 2. GPS Lawyer Search if suggest_lawyer is true
        suggested_lawyers = []
        if session.suggest_lawyer:
            # Query verified lawyers from database
            client = get_service_client()
            try:
                lawyers_res = client.table("lawyers").select("*").eq("is_verified", True).limit(5).execute()
                db_lawyers = lawyers_res.data or []
                
                # Format to uniform structure matching page finder expectations
                for l in db_lawyers:
                    suggested_lawyers.append({
                        "id": str(l.get("id")),
                        "full_name": l.get("full_name"),
                        "specialisations": l.get("specialisations", []),
                        "city": l.get("city"),
                        "state": l.get("state"),
                        "experience_years": l.get("experience_years", 0),
                        "fee_per_hour_inr": l.get("fee_per_hour_inr", 1000),
                        "offers_free_consultation": l.get("offers_free_consultation", False),
                        "rating": 4.7,  # Default rating placeholder
                        "languages": l.get("languages", ["English"])
                    })
            except Exception as le:
                logger.error(f"Failed to query lawyers from DB: {le}")
                
            # If no lawyers in DB, append mock lawyers matching GPS/Finder format to guarantee premium mock presentation
            if not suggested_lawyers:
                suggested_lawyers = [
                    { "id": "m1", "full_name": "Anjali Sharma", "specialisations": ["criminal", "family"], "city": "Mumbai", "state": "MH", "experience_years": 12, "fee_per_hour_inr": 1500, "offers_free_consultation": True, "rating": 4.8, "languages": ["English", "Hindi"] },
                    { "id": "m2", "full_name": "Rajesh Kumar", "specialisations": ["property", "civil"], "city": "Delhi", "state": "DL", "experience_years": 8, "fee_per_hour_inr": 1000, "offers_free_consultation": False, "rating": 4.5, "languages": ["English", "Hindi"] },
                    { "id": "m3", "full_name": "Priya Patel", "specialisations": ["corporate", "taxation"], "city": "Ahmedabad", "state": "GJ", "experience_years": 15, "fee_per_hour_inr": 2500, "offers_free_consultation": True, "rating": 4.9, "languages": ["English", "Gujarati"] }
                ]
                
            # Take top 3
            suggested_lawyers = suggested_lawyers[:3]
            
        # 3. Clear Redis session
        await conv_service.delete_session(session_id)
        
        return {
            "message": "Session completed successfully",
            "suggested_lawyers": suggested_lawyers
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to end voice session: {e}")
        raise HTTPException(status_code=500, detail="Failed to end voice session")

@router.post("/sos-call")
async def main_sos_call_endpoint(request: Request):
    import httpx
    
    if settings.vapi_mock_mode or not settings.vapi_private_key:
        logger.warning(
            f"Vapi configuration in Mock Mode or key missing. "
            f"Simulating SOS call to target: {settings.target_phone_number or 'registered phone number'}"
        )
        return {
            "status": "success",
            "message": "Call initiated successfully (Mock Mode)",
            "simulated": True
        }

    headers = {
        "Authorization": f"Bearer {settings.vapi_private_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "phoneNumberId": settings.vapi_phone_number_id,
        "customer": {
            "number": settings.target_phone_number
        },
        "assistantId": settings.vapi_assistant_id
    }
    
    try:
        async with httpx.AsyncClient(timeout=10) as hc:
            resp = await hc.post("https://api.vapi.ai/call", headers=headers, json=payload)
            try:
                resp_json = resp.json()
            except Exception:
                resp_json = resp.text
            logger.warning(f"vapi_call_response: status_code={resp.status_code}, body={resp_json}")
            resp.raise_for_status()
            return {"status": "success", "message": "Call initiated successfully"}
    except httpx.HTTPStatusError as e:
        try:
            error_body = e.response.json()
            error_msg = error_body.get("message", str(e))
        except Exception:
            error_msg = e.response.text or str(e)
        logger.error(f"Vapi /sos-call HTTP status error: {error_msg}")
        raise HTTPException(status_code=400, detail=f"Vapi Error: {error_msg}")
    except Exception as e:
        logger.error(f"Vapi /sos-call error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to initiate SOS call: {str(e)}")
