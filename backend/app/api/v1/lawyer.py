from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta, timezone
import uuid
import structlog

from app.models.lawyer import (
    LawyerFullProfile, LawyerProfileUpdate, AvailabilityToggle,
    LawyerDashboardStats, ActivityItem, RankingInsight, RankingFactor,
    ClientRequestItem, ClientRequestRespond,
    LawyerNotificationItem, ReviewReply,
    LawyerMapFilters, LawyerMapResponse
)
from app.supabase_client import get_service_client
from app.dependencies import require_user
from app.config import settings
from app.services import lawyer_service
from app.utils.redis_client import redis_client

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
    role = user.get("app_metadata", {}).get("user_role") or user.get("user_metadata", {}).get("role") or user.get("user_role")
    if role != "lawyer":
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
    client = get_service_client()
    lawyer = _get_lawyer_row(client, auth_id)
    lawyer_id = lawyer["id"]
    
    try:
        reviews_res = client.table("lawyer_reviews") \
            .select("id, rating, review_text, created_at, user_auth_id") \
            .eq("lawyer_id", lawyer_id) \
            .order("created_at", desc=True) \
            .execute()
        
        reviews = reviews_res.data or []
        
        total = len(reviews)
        avg = round(sum(r["rating"] for r in reviews) / total, 1) if total > 0 else 0.0
        
        distribution = [
            {"stars": s, "count": sum(1 for r in reviews if r["rating"] == s)}
            for s in [5, 4, 3, 2, 1]
        ]
        
        formatted_reviews = []
        for r in reviews:
            user_name = "Anonymous Client"
            try:
                user_res = client.table("users").select("email").eq("auth_id", r["user_auth_id"]).execute()
                if user_res.data:
                    email = user_res.data[0].get("email", "")
                    if email:
                        user_name = email.split("@")[0].capitalize()
            except Exception:
                pass
            
            formatted_reviews.append({
                "id": r["id"],
                "client_name": user_name,
                "rating": r["rating"],
                "text": r["review_text"] or "",
                "created_at": r["created_at"],
            })
            
        return {
            "summary": {
                "avg_rating": avg,
                "total_reviews": total,
                "distribution": distribution
            },
            "reviews": formatted_reviews
        }
    except Exception as e:
        logger.warning(f"Failed to fetch reviews: {e}")
        return {
            "summary": {
                "avg_rating": 0,
                "total_reviews": 0,
                "distribution": [{"stars": s, "count": 0} for s in [5, 4, 3, 2, 1]]
            },
            "reviews": []
        }


@router.post("/me/reviews/{review_id}/reply")
async def reply_to_review(review_id: str, data: ReviewReply, user: dict = Depends(require_user)):
    auth_id = _require_lawyer(user)
    # Reviews table TBD - placeholder response for now
    return {"message": "Reply submitted", "review_id": review_id, "reply": data.reply}


# ═══════════════════════════════════════════════════════════════
# CONSULTATIONS
# ═══════════════════════════════════════════════════════════════

@router.get("/me/consultations")
async def get_my_consultations(user: dict = Depends(require_user)):
    auth_id = _require_lawyer(user)
    client = get_service_client()
    lawyer = _get_lawyer_row(client, auth_id)
    lawyer_id = lawyer["id"]
    
    try:
        res = client.table("client_requests") \
            .select("*") \
            .eq("lawyer_id", lawyer_id) \
            .eq("status", "responded") \
            .order("responded_at", desc=True) \
            .execute()
            
        consultations = []
        for r in (res.data or []):
            slots = r.get("availability_slots") or []
            
            # Estimate expiry state
            is_upcoming = False
            try:
                expires_at = datetime.fromisoformat(r.get("expires_at").replace("Z", "+00:00"))
                is_upcoming = expires_at > datetime.now(timezone.utc)
            except Exception:
                pass

            consultations.append({
                "id": r["id"],
                "client_name": r.get("user_email", "Client").split("@")[0].capitalize() if r.get("user_email") else "Client",
                "category": r.get("category", "General").capitalize(),
                "scheduled_at": r.get("responded_at") or r.get("created_at"),
                "duration_minutes": 30,
                "status": "upcoming" if is_upcoming else "completed",
                "notes": r.get("situation_summary")
            })
        return consultations
    except Exception as e:
        logger.warning(f"Failed to fetch consultations: {e}")
        return []


# ── Map & Geocoding Endpoints ─────────────────────────────────

@router.get("/map", response_model=LawyerMapResponse)
async def get_lawyers_on_map(
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    city: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    radius_km: float = Query(15.0),
    specialisation: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    max_fee: Optional[int] = Query(None),
    available_only: bool = Query(False),
    limit: int = Query(50)
):
    """
    Search and plot lawyers on a map with filters and GPS calculations.
    """
    filters = LawyerMapFilters(
        specialisation=specialisation,
        language=language,
        max_fee=max_fee,
        available_only=available_only,
        limit=limit
    )
    
    cache_key = f"lawyers_map:lat={lat}:lon={lon}:city={city}:state={state}:radius={radius_km}:spec={specialisation}:lang={language}:fee={max_fee}:avail={available_only}:lim={limit}"
    
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            import json
            return LawyerMapResponse.model_validate_json(cached)
    except Exception as e:
        logger.warning(f"Failed to read from cache: {e}")
        
    client = get_service_client()
    
    import asyncio
    try:
        response = await asyncio.to_thread(
            lawyer_service.get_map_pins,
            db_client=client,
            lat=lat,
            lon=lon,
            city=city,
            state=state,
            radius_km=radius_km,
            filters=filters
        )
    except Exception as e:
        logger.error(f"Error querying map pins: {e}")
        raise HTTPException(status_code=500, detail="Failed to search lawyers near location.")
        
    try:
        await redis_client.setex(cache_key, 300, response.model_dump_json())
    except Exception as e:
        logger.warning(f"Failed to write to cache: {e}")
        
    return response


class ContactLawyerRequest(BaseModel):
    category: str
    situation_summary: str
    user_city: str
    user_language: str
    urgency: str = "normal"
    user_phone: Optional[str] = None


@router.post("/{lawyer_id}/contact")
async def contact_lawyer(
    lawyer_id: str,
    data: ContactLawyerRequest,
    user: dict = Depends(require_user)
):
    client = get_service_client()
    user_auth_id = user["sub"]
    user_email = user.get("email")
    
    # Check if lawyer exists
    lawyer_res = client.table("lawyers").select("id, auth_id").eq("id", lawyer_id).execute()
    if not lawyer_res.data:
        raise HTTPException(status_code=404, detail="Lawyer not found")
        
    expires_at = datetime.now(timezone.utc) + timedelta(days=2)
    
    request_data = {
        "id": str(uuid.uuid4()),
        "lawyer_id": lawyer_id,
        "category": data.category,
        "situation_summary": data.situation_summary,
        "user_city": data.user_city,
        "user_language": data.user_language,
        "urgency": data.urgency,
        "status": "pending",
        "expires_at": expires_at.isoformat(),
        "user_auth_id": user_auth_id,
        "user_email": user_email,
        "user_phone": data.user_phone,
    }
    
    res = client.table("client_requests").insert(request_data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create connection request")
        
    # Also trigger a notification for the lawyer!
    try:
        lawyer_auth_id = lawyer_res.data[0]["auth_id"]
        client.table("lawyer_notifications").insert({
            "lawyer_auth_id": lawyer_auth_id,
            "type": "new_request",
            "title": "New Client Inquiry",
            "body": f"A client is requesting consultation regarding a {data.category} matter.",
        }).execute()
    except Exception as e:
        logger.warning(f"Failed to notify lawyer: {e}")
        
    return {"status": "success", "request_id": request_data["id"]}


@router.get("/geocode")
async def geocode_address(address: str = Query(...)):
    """
    Resolve text search / address query to latitude and longitude.
    """
    if not settings.google_maps_api_key:
        return {
            "latitude": 19.0760,
            "longitude": 72.8777,
            "formatted_address": "Mumbai, Maharashtra, India (Fallback)"
        }
        
    import httpx
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={
                    "address": address,
                    "key": settings.google_maps_api_key
                },
                timeout=10.0
            )
            if res.status_code != 200:
                raise HTTPException(status_code=502, detail="Failed to fetch from geocoding service.")
                
            data = res.json()
            if data.get("status") != "OK" or not data.get("results"):
                raise HTTPException(status_code=404, detail="Address not found.")
                
            result = data["results"][0]
            loc = result["geometry"]["location"]
            return {
                "latitude": loc["lat"],
                "longitude": loc["lng"],
                "formatted_address": result.get("formatted_address")
            }
        except httpx.HTTPError as e:
            logger.error(f"Geocoding HTTP error: {e}")
            raise HTTPException(status_code=502, detail="Geocoding service error.")

