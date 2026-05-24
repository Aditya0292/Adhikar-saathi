from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timedelta, timezone
import uuid
import structlog

from app.models.lawyer import (
    LawyerFullProfile, LawyerProfileUpdate, AvailabilityToggle,
    LawyerDashboardStats, ActivityItem, RankingInsight, RankingFactor,
    ClientRequestItem, ClientRequestRespond,
    LawyerNotificationItem, ReviewReply
)
from app.supabase_client import get_service_client
from app.dependencies import require_user

logger = structlog.get_logger()
router = APIRouter(prefix="/lawyers", tags=["Lawyer Dashboard"])


# ── Helper ─────────────────────────────────────────────────────
def _get_lawyer_row(client, auth_id: str):
    """Fetch the full lawyer row for a given auth_id."""
    res = client.table("lawyers").select("*").eq("auth_id", auth_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Lawyer profile not found")
    return res.data[0]


def _require_lawyer(user: dict):
    """Ensure the authenticated user is a lawyer."""
    if user.get("user_role") != "lawyer":
        raise HTTPException(status_code=403, detail="Lawyer access required")
    return user["sub"]


# ═══════════════════════════════════════════════════════════════
# PROFILE
# ═══════════════════════════════════════════════════════════════

@router.get("/me/profile")
async def get_my_profile(user: dict = Depends(require_user)):
    auth_id = _require_lawyer(user)
    client = get_service_client()
    row = _get_lawyer_row(client, auth_id)
    return row


@router.patch("/me/profile")
async def update_my_profile(data: LawyerProfileUpdate, user: dict = Depends(require_user)):
    auth_id = _require_lawyer(user)
    client = get_service_client()
    
    # Only update fields that were explicitly set
    update_dict = data.model_dump(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    res = client.table("lawyers").update(update_dict).eq("auth_id", auth_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Lawyer profile not found")
    return res.data[0]


@router.patch("/me/availability")
async def toggle_availability(data: AvailabilityToggle, user: dict = Depends(require_user)):
    auth_id = _require_lawyer(user)
    client = get_service_client()
    
    res = client.table("lawyers").update({"is_available": data.is_available}).eq("auth_id", auth_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Lawyer profile not found")
    return {"is_available": res.data[0].get("is_available", data.is_available)}


# ═══════════════════════════════════════════════════════════════
# STATS
# ═══════════════════════════════════════════════════════════════

@router.get("/me/stats")
async def get_dashboard_stats(user: dict = Depends(require_user)):
    auth_id = _require_lawyer(user)
    client = get_service_client()
    lawyer = _get_lawyer_row(client, auth_id)
    lawyer_id = lawyer["id"]
    
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)
    
    # Profile views this week vs last week
    try:
        views_this = client.table("lawyer_profile_views") \
            .select("id", count="exact") \
            .eq("lawyer_id", lawyer_id) \
            .gte("created_at", week_ago.isoformat()) \
            .execute()
        views_last = client.table("lawyer_profile_views") \
            .select("id", count="exact") \
            .eq("lawyer_id", lawyer_id) \
            .gte("created_at", two_weeks_ago.isoformat()) \
            .lt("created_at", week_ago.isoformat()) \
            .execute()
        pv_this = views_this.count or 0
        pv_last = views_last.count or 0
    except Exception:
        pv_this, pv_last = 0, 0
    
    # Pending requests count
    try:
        pending_res = client.table("client_requests") \
            .select("id", count="exact") \
            .eq("lawyer_id", lawyer_id) \
            .eq("status", "pending") \
            .execute()
        pending_count = pending_res.count or 0
    except Exception:
        pending_count = 0
    
    # Response rate: responded / (responded + expired) — declined is NOT counted against
    try:
        responded = client.table("client_requests") \
            .select("id", count="exact") \
            .eq("lawyer_id", lawyer_id) \
            .eq("status", "responded") \
            .execute()
        expired = client.table("client_requests") \
            .select("id", count="exact") \
            .eq("lawyer_id", lawyer_id) \
            .eq("status", "expired") \
            .execute()
        r_count = responded.count or 0
        e_count = expired.count or 0
        total_actionable = r_count + e_count
        rate = round((r_count / total_actionable) * 100, 1) if total_actionable > 0 else 100.0
    except Exception:
        rate = 100.0
    
    # Average rating — placeholder (reviews table TBD)
    avg_rating = 0.0
    total_reviews = 0
    
    return {
        "profile_views": pv_this,
        "profile_views_delta": pv_this - pv_last,
        "pending_requests": pending_count,
        "response_rate": rate,
        "avg_rating": avg_rating,
        "total_reviews": total_reviews,
    }


# ═══════════════════════════════════════════════════════════════
# ACTIVITY FEED
# ═══════════════════════════════════════════════════════════════

@router.get("/me/activity")
async def get_activity_feed(user: dict = Depends(require_user)):
    auth_id = _require_lawyer(user)
    client = get_service_client()
    lawyer = _get_lawyer_row(client, auth_id)
    lawyer_id = lawyer["id"]
    
    activities: List[dict] = []
    
    # Recent notifications as activity items
    try:
        notifs = client.table("lawyer_notifications") \
            .select("id, type, title, body, created_at") \
            .eq("lawyer_auth_id", auth_id) \
            .order("created_at", desc=True) \
            .limit(10) \
            .execute()
        
        icon_map = {
            "new_request": "📥",
            "review": "⭐",
            "profile_view": "👁",
            "verification": "✅",
            "ranking": "📊",
        }
        
        for n in (notifs.data or []):
            activities.append({
                "id": n["id"],
                "icon": icon_map.get(n.get("type", ""), "📌"),
                "text": n.get("body") or n.get("title", ""),
                "timestamp": n["created_at"],
            })
    except Exception as e:
        logger.warning(f"Activity feed notification fetch failed: {e}")
    
    # If less than 10, pad with recent profile views
    if len(activities) < 10:
        try:
            views = client.table("lawyer_profile_views") \
                .select("id, viewer_city, created_at") \
                .eq("lawyer_id", lawyer_id) \
                .order("created_at", desc=True) \
                .limit(10 - len(activities)) \
                .execute()
            for v in (views.data or []):
                city = v.get("viewer_city") or "an unknown city"
                activities.append({
                    "id": v["id"],
                    "icon": "👁",
                    "text": f"A user in {city} viewed your profile",
                    "timestamp": v["created_at"],
                })
        except Exception:
            pass
    
    # Sort by timestamp descending, limit 10
    activities.sort(key=lambda a: a.get("timestamp", ""), reverse=True)
    return activities[:10]


# ═══════════════════════════════════════════════════════════════
# RANKING INSIGHT
# ═══════════════════════════════════════════════════════════════

@router.get("/me/ranking")
async def get_ranking_insight(user: dict = Depends(require_user)):
    auth_id = _require_lawyer(user)
    client = get_service_client()
    lawyer = _get_lawyer_row(client, auth_id)
    
    city = lawyer.get("city", "")
    primary_spec = lawyer.get("specialisations", ["general"])[0] if lawyer.get("specialisations") else "general"
    
    # Count verified lawyers in same city
    try:
        city_lawyers = client.table("lawyers") \
            .select("id", count="exact") \
            .eq("city", city) \
            .eq("is_verified", True) \
            .execute()
        total_in_city = city_lawyers.count or 1
    except Exception:
        total_in_city = 1
    
    # Simple rank estimation (verified + available + has photo boosts rank)
    rank = max(1, total_in_city // 2)  # Placeholder — real scoring TBD
    
    factors = []
    
    # Verified check
    if lawyer.get("is_verified"):
        factors.append({"label": "Verified profile", "status": "good", "detail": "✓ Verified", "weight": "high", "tip": "Your profile is verified — this is the highest trust signal."})
    else:
        factors.append({"label": "Verified profile", "status": "bad", "detail": "✗ Not verified", "weight": "high", "tip": "Complete verification to appear in search results."})
    
    # Availability
    if lawyer.get("is_available"):
        factors.append({"label": "Availability", "status": "good", "detail": "🟢 Available", "weight": "medium", "tip": "You're marked as available — great for matching."})
    else:
        factors.append({"label": "Availability", "status": "warning", "detail": "🔴 Unavailable", "weight": "medium", "tip": "Toggle availability on to receive client requests."})
    
    # Bio
    if lawyer.get("bio") and len(lawyer.get("bio", "")) > 50:
        factors.append({"label": "Profile bio", "status": "good", "detail": f"{len(lawyer.get('bio', ''))} chars", "weight": "low", "tip": "A detailed bio helps clients trust you."})
    else:
        factors.append({"label": "Profile bio", "status": "bad", "detail": "✗ Missing or too short", "weight": "low", "tip": "Add a bio of at least 50 characters to improve your ranking."})
    
    # Photo
    if lawyer.get("profile_photo_url"):
        factors.append({"label": "Profile photo", "status": "good", "detail": "✓ Uploaded", "weight": "low", "tip": "Profiles with photos get 3x more views."})
    else:
        factors.append({"label": "Profile photo", "status": "bad", "detail": "✗ No photo", "weight": "low", "tip": "Upload a professional photo to stand out."})
    
    return {
        "rank": rank,
        "total": total_in_city,
        "city": city,
        "specialisation": primary_spec,
        "factors": factors,
    }


# ═══════════════════════════════════════════════════════════════
# CLIENT REQUESTS (the leads inbox)
# ═══════════════════════════════════════════════════════════════

@router.get("/me/requests")
async def get_my_requests(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    urgency: Optional[str] = Query(None),
    user: dict = Depends(require_user)
):
    auth_id = _require_lawyer(user)
    client = get_service_client()
    lawyer = _get_lawyer_row(client, auth_id)
    lawyer_id = lawyer["id"]
    
    # ── ACTIVE EXPIRY ENFORCEMENT (Option A) ──
    # Before fetching, expire any stale pending requests for this lawyer
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        client.table("client_requests") \
            .update({"status": "expired"}) \
            .eq("lawyer_id", lawyer_id) \
            .eq("status", "pending") \
            .lt("expires_at", now_iso) \
            .execute()
    except Exception as e:
        logger.warning(f"Request expiry enforcement failed: {e}")
    
    # ── FETCH ──
    query = client.table("client_requests") \
        .select("*") \
        .eq("lawyer_id", lawyer_id) \
        .order("created_at", desc=True)
    
    if status:
        query = query.eq("status", status)
    if category:
        query = query.eq("category", category)
    if urgency:
        query = query.eq("urgency", urgency)
    
    res = query.limit(50).execute()
    
    # Hide user contact info for non-responded requests
    items = []
    for r in (res.data or []):
        item = dict(r)
        if item.get("status") != "responded":
            item.pop("user_email", None)
            item.pop("user_phone", None)
        items.append(item)
    
    return items


@router.patch("/me/requests/{request_id}/respond")
async def respond_to_request(request_id: str, data: ClientRequestRespond, user: dict = Depends(require_user)):
    auth_id = _require_lawyer(user)
    client = get_service_client()
    lawyer = _get_lawyer_row(client, auth_id)
    lawyer_id = lawyer["id"]
    
    # Verify ownership
    req_res = client.table("client_requests") \
        .select("*") \
        .eq("id", request_id) \
        .eq("lawyer_id", lawyer_id) \
        .execute()
    
    if not req_res.data:
        raise HTTPException(status_code=404, detail="Request not found")
    
    request = req_res.data[0]
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot respond to a request with status '{request['status']}'")
    
    # Check not expired
    expires_at = datetime.fromisoformat(request["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        # Mark as expired
        client.table("client_requests").update({"status": "expired"}).eq("id", request_id).execute()
        raise HTTPException(status_code=400, detail="This request has expired")
    
    # Update request
    update_data = {
        "status": "responded",
        "response_message": data.message,
        "availability_slots": data.availability_slots,
        "response_fee_inr": data.fee if not data.free_consultation else 0,
        "responded_at": datetime.now(timezone.utc).isoformat(),
    }
    
    res = client.table("client_requests").update(update_data).eq("id", request_id).execute()
    
    # Create notification for the user (if user_auth_id exists)
    if request.get("user_auth_id"):
        try:
            client.table("lawyer_notifications").insert({
                "lawyer_auth_id": auth_id,
                "type": "request_responded",
                "title": "You responded to a client request",
                "body": f"Your response to the {request.get('category', '')} inquiry has been sent.",
            }).execute()
        except Exception:
            pass
    
    return res.data[0] if res.data else {"status": "responded"}


@router.patch("/me/requests/{request_id}/decline")
async def decline_request(request_id: str, user: dict = Depends(require_user)):
    auth_id = _require_lawyer(user)
    client = get_service_client()
    lawyer = _get_lawyer_row(client, auth_id)
    lawyer_id = lawyer["id"]
    
    req_res = client.table("client_requests") \
        .select("id, status") \
        .eq("id", request_id) \
        .eq("lawyer_id", lawyer_id) \
        .execute()
    
    if not req_res.data:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if req_res.data[0]["status"] != "pending":
        raise HTTPException(status_code=400, detail="Can only decline pending requests")
    
    res = client.table("client_requests") \
        .update({"status": "declined"}) \
        .eq("id", request_id) \
        .execute()
    
    return {"status": "declined"}


# ═══════════════════════════════════════════════════════════════
# NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════

@router.get("/me/notifications")
async def get_notifications(user: dict = Depends(require_user)):
    auth_id = _require_lawyer(user)
    client = get_service_client()
    
    res = client.table("lawyer_notifications") \
        .select("*") \
        .eq("lawyer_auth_id", auth_id) \
        .order("created_at", desc=True) \
        .limit(30) \
        .execute()
    
    return res.data or []


@router.patch("/me/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(require_user)):
    auth_id = _require_lawyer(user)
    client = get_service_client()
    
    res = client.table("lawyer_notifications") \
        .update({"is_read": True}) \
        .eq("id", notification_id) \
        .eq("lawyer_auth_id", auth_id) \
        .execute()
    
    if not res.data:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"is_read": True}


# ═══════════════════════════════════════════════════════════════
# REVIEWS
# ═══════════════════════════════════════════════════════════════

@router.get("/me/reviews")
async def get_my_reviews(user: dict = Depends(require_user)):
    auth_id = _require_lawyer(user)
    # Reviews table TBD — return mock structure for now
    return {
        "summary": {
            "avg_rating": 0,
            "total_reviews": 0,
            "distribution": [
                {"stars": 5, "count": 0},
                {"stars": 4, "count": 0},
                {"stars": 3, "count": 0},
                {"stars": 2, "count": 0},
                {"stars": 1, "count": 0},
            ]
        },
        "reviews": []
    }


@router.post("/me/reviews/{review_id}/reply")
async def reply_to_review(review_id: str, data: ReviewReply, user: dict = Depends(require_user)):
    auth_id = _require_lawyer(user)
    # Reviews table TBD
    return {"message": "Reply submitted", "review_id": review_id, "reply": data.reply}
