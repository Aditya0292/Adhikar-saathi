from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import structlog
from app.supabase_client import get_service_client
from app.dependencies import require_admin

logger = structlog.get_logger()
router = APIRouter(prefix="/admin", tags=["Admin Verification System"])

class RejectRequest(BaseModel):
    reason: str = Field(min_length=20, max_length=500)
    missing_documents: Optional[List[str]] = None

class InfoRequest(BaseModel):
    message: str = Field(min_length=20)


@router.get("/lawyers/pending")
async def get_pending_lawyers(
    status: str = Query("pending", description="'pending' | 'under_review' | 'verified' | 'rejected' | 'all'"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: dict = Depends(require_admin)
):
    client = get_service_client()
    query = client.table("lawyers").select("*", count="exact")
    
    if status != "all":
        query = query.eq("verification_status", status)
    
    # Pagination
    offset = (page - 1) * page_size
    query = query.order("created_at", desc=False).range(offset, offset + page_size - 1)
    
    res = query.execute()
    total = res.count or 0
    items = []
    
    all_paths = []
    for row in (res.data or []):
        if row.get("enrollment_certificate_path"): all_paths.append(row["enrollment_certificate_path"])
        if row.get("certificate_of_practice_path"): all_paths.append(row["certificate_of_practice_path"])
        if row.get("government_id_path"): all_paths.append(row["government_id_path"])
        
    url_map = {}
    if all_paths:
        try:
            signed_urls_res = client.storage.from_("lawyer-documents").create_signed_urls(all_paths, 3600)
            # Depending on supabase-py version, it might return a list of dicts directly
            for item in signed_urls_res:
                if "error" not in item and "signedURL" in item:
                    url_map[item["path"]] = item["signedURL"]
        except Exception as e:
            logger.warning(f"Error batch generating presigned URLs: {e}")
            
    now = datetime.now(timezone.utc)
    for row in (res.data or []):
        created_at = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
        days_waiting = (now - created_at).days

        items.append({
            "id": row["id"],
            "auth_id": row["auth_id"],
            "full_name": row["full_name"],
            "email": row["email"],
            "phone": row.get("phone"),
            "bar_enrollment_number": row.get("bar_enrollment_number"),
            "state_bar_council": row.get("state_bar_council"),
            "enrollment_year": row.get("enrollment_year"),
            "experience_years": row.get("experience_years"),
            "specialisations": row.get("specialisations", []),
            "city": row.get("city"),
            "state": row.get("state"),
            "government_id_type": row.get("government_id_type"),
            "government_id_last4": row.get("government_id_last4"),
            "verification_status": row.get("verification_status"),
            "submitted_at": row["created_at"],
            "days_waiting": days_waiting,
            "enrollment_certificate_url": url_map.get(row.get("enrollment_certificate_path")),
            "certificate_of_practice_url": url_map.get(row.get("certificate_of_practice_path")),
            "government_id_url": url_map.get(row.get("government_id_path")),
        })
        
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.patch("/lawyers/{lawyer_id}/approve")
async def approve_lawyer(lawyer_id: str, user: dict = Depends(require_admin)):
    admin_auth_id = user["sub"]
    client = get_service_client()
    
    # 1. Fetch lawyer by id
    lawyer_res = client.table("lawyers").select("*").eq("id", lawyer_id).execute()
    if not lawyer_res.data:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    
    lawyer = lawyer_res.data[0]
    
    # 2. Verify current status
    if lawyer.get("verification_status") == "verified":
        raise HTTPException(status_code=409, detail="Already verified — no action taken")
        
    # 3. Update lawyers table
    update_data = {
        "is_verified": True,
        "verification_status": "verified",
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "verified_by": admin_auth_id
    }
    client.table("lawyers").update(update_data).eq("id", lawyer_id).execute()
    
    # Update Supabase Auth app_metadata to allow login
    try:
        user_resp = client.auth.admin.get_user_by_id(lawyer["auth_id"])
        if user_resp and user_resp.user:
            current_metadata = user_resp.user.app_metadata or {}
            current_metadata["lawyer_verified"] = True
            client.auth.admin.update_user_by_id(lawyer["auth_id"], {"app_metadata": current_metadata})
    except Exception as e:
        logger.warning(f"Failed to update auth metadata for {lawyer['auth_id']}: {e}")
    
    # 4. Insert notification
    try:
        client.table("lawyer_notifications").insert({
            "lawyer_auth_id": lawyer["auth_id"],
            "type": "verification_approved",
            "title": "Your profile has been verified",
            "body": "Congratulations! Your NyayaSatya advocate profile is now live. You can start receiving client requests.",
            "is_read": False
        }).execute()
    except Exception as e:
        logger.warning(f"Failed to create approval notification: {e}")
        
    # TODO Phase 2: Send email
    
    return {
        "success": True,
        "lawyer_name": lawyer["full_name"],
        "message": "Verified successfully"
    }

@router.patch("/lawyers/{lawyer_id}/reject")
async def reject_lawyer(lawyer_id: str, request: RejectRequest, user: dict = Depends(require_admin)):
    admin_auth_id = user["sub"]
    client = get_service_client()
    
    # 1. Fetch lawyer by id
    lawyer_res = client.table("lawyers").select("*").eq("id", lawyer_id).execute()
    if not lawyer_res.data:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    
    lawyer = lawyer_res.data[0]
    
    # 2. Update lawyers table
    update_data = {
        "is_verified": False,
        "verification_status": "rejected",
        "rejection_reason": request.reason,
        "verified_by": admin_auth_id
    }
    client.table("lawyers").update(update_data).eq("id", lawyer_id).execute()
    
    # 3. Insert notification
    try:
        client.table("lawyer_notifications").insert({
            "lawyer_auth_id": lawyer["auth_id"],
            "type": "verification_rejected",
            "title": "Action required on your application",
            "body": f"Your application needs attention: {request.reason}",
            "is_read": False
        }).execute()
    except Exception as e:
        logger.warning(f"Failed to create rejection notification: {e}")
        
    # TODO Phase 2: Send email
    
    return {"success": True}

@router.patch("/lawyers/{lawyer_id}/request-info")
async def request_info_lawyer(lawyer_id: str, request: InfoRequest, user: dict = Depends(require_admin)):
    client = get_service_client()
    
    lawyer_res = client.table("lawyers").select("*").eq("id", lawyer_id).execute()
    if not lawyer_res.data:
        raise HTTPException(status_code=404, detail="Lawyer not found")
        
    lawyer = lawyer_res.data[0]
    
    # 1. Update verification_status to under_review
    client.table("lawyers").update({"verification_status": "under_review"}).eq("id", lawyer_id).execute()
    
    # 2. Insert notification
    try:
        client.table("lawyer_notifications").insert({
            "lawyer_auth_id": lawyer["auth_id"],
            "type": "verification_info_request",
            "title": "Additional information requested",
            "body": request.message,
            "is_read": False
        }).execute()
    except Exception as e:
        logger.warning(f"Failed to create info request notification: {e}")
        
    return {"success": True}

@router.get("/lawyers/{lawyer_id}")
async def get_lawyer_detail(lawyer_id: str, user: dict = Depends(require_admin)):
    client = get_service_client()
    lawyer_res = client.table("lawyers").select("*").eq("id", lawyer_id).execute()
    if not lawyer_res.data:
        raise HTTPException(status_code=404, detail="Lawyer not found")
        
    row = lawyer_res.data[0]
    now = datetime.now(timezone.utc)
    created_at = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
    days_waiting = (now - created_at).days
    
    enroll_url = None
    cop_url = None
    gov_url = None
    
    try:
        if row.get("enrollment_certificate_path"):
            enroll_url = client.storage.from_("lawyer-documents").create_signed_url(row["enrollment_certificate_path"], expires_in=3600).get("signedURL")
        if row.get("certificate_of_practice_path"):
            cop_url = client.storage.from_("lawyer-documents").create_signed_url(row["certificate_of_practice_path"], expires_in=3600).get("signedURL")
        if row.get("government_id_path"):
            gov_url = client.storage.from_("lawyer-documents").create_signed_url(row["government_id_path"], expires_in=3600).get("signedURL")
    except Exception as e:
        logger.warning(f"Error generating presigned URLs for lawyer {row['id']}: {e}")
        
    return {
        "id": row["id"],
        "auth_id": row["auth_id"],
        "full_name": row["full_name"],
        "email": row["email"],
        "phone": row.get("phone"),
        "bar_enrollment_number": row.get("bar_enrollment_number"),
        "state_bar_council": row.get("state_bar_council"),
        "enrollment_year": row.get("enrollment_year"),
        "experience_years": row.get("experience_years"),
        "specialisations": row.get("specialisations", []),
        "city": row.get("city"),
        "state": row.get("state"),
        "government_id_type": row.get("government_id_type"),
        "government_id_last4": row.get("government_id_last4"),
        "verification_status": row.get("verification_status"),
        "submitted_at": row["created_at"],
        "days_waiting": days_waiting,
        "enrollment_certificate_url": enroll_url,
        "certificate_of_practice_url": cop_url,
        "government_id_url": gov_url,
    }

@router.get("/platform-stats")
async def get_admin_stats(user: dict = Depends(require_admin)):
    client = get_service_client()
    now = datetime.now(timezone.utc)
    
    # 1. Total verified lawyers
    lawyers_res = client.table("lawyers").select("id", count="exact").eq("is_verified", True).execute()
    total_verified = lawyers_res.count or 0
    
    # 2. Total registered users (simplified as checking users table)
    users_res = client.table("users").select("id", count="exact").execute()
    total_users = users_res.count or 0
    
    # 3. Total queries
    queries_res = client.table("query_logs").select("id", count="exact").execute()
    total_queries = queries_res.count or 0
    
    # 4. Total documents
    docs_res = client.table("documents").select("id", count="exact").execute()
    total_docs = docs_res.count or 0
    
    # 5. Funnel stats (this month)
    first_day = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    applied_this_month = client.table("lawyers").select("id", count="exact").gte("created_at", first_day).execute().count or 0
    verified_this_month = client.table("lawyers").select("id", count="exact").gte("verified_at", first_day).execute().count or 0
    rejected_this_month = client.table("lawyers").select("id", count="exact").eq("verification_status", "rejected").gte("verified_at", first_day).execute().count or 0
    pending_count = client.table("lawyers").select("id", count="exact").eq("verification_status", "pending").execute().count or 0
    under_review_count = client.table("lawyers").select("id", count="exact").eq("verification_status", "under_review").execute().count or 0
    
    funnel_conversion = (verified_this_month / applied_this_month * 100) if applied_this_month > 0 else 0
    
    # 6. Today's queries
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_queries = client.table("query_logs").select("*").gte("created_at", today_start).execute().data or []
    
    fast_mode_today = sum(1 for q in today_queries if not q.get("is_verified_mode", False))
    verified_mode_today = sum(1 for q in today_queries if q.get("is_verified_mode", False))
    
    fast_latencies = [q.get("latency_ms", 0) for q in today_queries if not q.get("is_verified_mode", False) and q.get("latency_ms")]
    avg_latency = (sum(fast_latencies) / len(fast_latencies)) if fast_latencies else 0
    
    hallucinations = sum(1 for q in today_queries if q.get("flagged_hallucination", False))
    
    # 7. Recent verifications
    recent_verifications = client.table("lawyers") \
        .select("id, full_name, bar_enrollment_number, city, verified_by, verified_at, created_at") \
        .eq("is_verified", True) \
        .order("verified_at", desc=True) \
        .limit(20) \
        .execute().data or []
        
    for r in recent_verifications:
        v_at = datetime.fromisoformat(r["verified_at"].replace("Z", "+00:00"))
        c_at = datetime.fromisoformat(r["created_at"].replace("Z", "+00:00"))
        hours_diff = round((v_at - c_at).total_seconds() / 3600, 1)
        r["time_to_verify_hours"] = hours_diff
    
    return {
        "platform_health": {
            "total_verified_lawyers": total_verified,
            "total_registered_users": total_users,
            "total_queries": total_queries,
            "total_documents_scanned": total_docs
        },
        "verification_funnel": {
            "applied_this_month": applied_this_month,
            "verified_this_month": verified_this_month,
            "rejected_this_month": rejected_this_month,
            "pending": pending_count,
            "under_review": under_review_count,
            "funnel_conversion_pct": round(funnel_conversion, 1)
        },
        "query_stats": {
            "fast_mode_today": fast_mode_today,
            "verified_mode_today": verified_mode_today,
            "avg_latency_ms": round(avg_latency),
            "hallucination_rejections_today": hallucinations
        },
        "recent_verifications": recent_verifications
    }
