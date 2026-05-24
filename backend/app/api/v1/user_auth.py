from fastapi import APIRouter, HTTPException, Depends, Query, Response
from typing import Optional
import structlog
from datetime import datetime

from app.models.user import UpdateUserRequest
from app.models.query_log import QueryLogSummary, PaginatedQueryLogResponse
from app.supabase_client import get_service_client, get_anon_client
from app.dependencies import require_user

logger = structlog.get_logger()
router = APIRouter(prefix="/users", tags=["Users"])

SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "हिन्दी",
    "ta": "தமிழ்",
    "te": "తెలుగు",
    "bn": "বাংলা",
    "mr": "मराठी",
    "gu": "ગુજરાતી",
    "kn": "ಕನ್ನಡ",
    "ml": "മലയാളം",
    "pa": "ਪੰਜਾਬੀ",
}

@router.get("/me")
async def get_my_profile(user: dict = Depends(require_user)):
    client = get_service_client()
    res = client.table("users").select("*").eq("auth_id", user["sub"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User profile not found")
    return res.data[0]

@router.patch("/me")
async def update_my_profile(data: UpdateUserRequest, user: dict = Depends(require_user)):
    if data.preferred_language and data.preferred_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail="Unsupported language selected")
        
    client = get_service_client()
    update_data = {}
    if data.preferred_language:
        update_data["preferred_language"] = data.preferred_language
        
    if not update_data:
        return await get_my_profile(user=user)
        
    res = client.table("users").update(update_data).eq("auth_id", user["sub"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User profile not found")
    return res.data[0]

@router.get("/me/query-history", response_model=PaginatedQueryLogResponse)
async def get_query_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: dict = Depends(require_user)
):
    client = get_service_client()
    offset = (page - 1) * page_size
    
    # Get total count
    count_res = client.table("query_logs").select("id", count="exact").eq("user_auth_id", user["sub"]).execute()
    total = count_res.count if count_res.count is not None else 0
    
    # Get paginated data
    res = client.table("query_logs").select("id, query_text, mode, was_helpful, created_at") \
        .eq("user_auth_id", user["sub"]) \
        .order("created_at", desc=True) \
        .range(offset, offset + page_size - 1) \
        .execute()
        
    items = [QueryLogSummary.from_db(row) for row in res.data]
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.get("/me/documents")
async def get_my_documents(user: dict = Depends(require_user)):
    client = get_service_client()
    res = client.table("documents").select(
        "id, original_filename, processing_status, risk_score, created_at"
    ).eq("user_auth_id", user["sub"]).order("created_at", desc=True).execute()
    
    return res.data

@router.delete("/me/account", status_code=204)
async def delete_my_account(user: dict = Depends(require_user)):
    auth_id = user["sub"]
    client = get_service_client()
    
    # 1. Soft delete the users table record
    client.table("users").update({"is_active": False}).eq("auth_id", auth_id).execute()
    
    # 2. Get user's documents to delete from storage
    docs_res = client.table("documents").select("storage_path").eq("user_auth_id", auth_id).execute()
    if docs_res.data:
        paths_to_delete = [doc["storage_path"] for doc in docs_res.data if doc.get("storage_path")]
        if paths_to_delete:
            try:
                # Delete files from private bucket
                client.storage.from_("user-documents").remove(paths_to_delete)
            except Exception as e:
                logger.error("storage_deletion_failed", error=str(e), paths=paths_to_delete)
    
    # 3. Delete from Supabase Auth
    try:
        client.auth.admin.delete_user(auth_id)
    except Exception as e:
        logger.error("supabase_auth_deletion_failed", error=str(e), auth_id=auth_id)
        # Even if auth deletion fails slightly, we still return 204 as soft-delete succeeded
    
    return Response(status_code=204)
