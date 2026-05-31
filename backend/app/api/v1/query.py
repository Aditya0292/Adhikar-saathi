from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from app.config import settings
from app.services.fast_mode import fast_mode_service, FastModeResponse
from app.services.verified_mode import verified_mode_service, VerifiedModeResponse

router = APIRouter()

class QueryRequest(BaseModel):
    query: str
    language: str = "en"
    session_id: Optional[str] = None

@router.post("/fast", response_model=FastModeResponse)
async def query_fast(request: QueryRequest):
    if not settings.fast_mode_enabled:
        raise HTTPException(status_code=503, detail="Fast mode is currently disabled.")
        
    return await fast_mode_service.answer(
        query=request.query,
        language=request.language,
        session_id=request.session_id
    )

@router.post("/verified", response_model=VerifiedModeResponse)
async def query_verified(request: QueryRequest):
    if not settings.verified_mode_enabled:
        raise HTTPException(status_code=503, detail="Verified mode is currently setting up. Try Quick Mode for now.")
        
    return await verified_mode_service.answer(
        query=request.query,
        language=request.language,
        session_id=request.session_id
    )
