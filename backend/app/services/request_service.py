"""
Request Service — handles the creation of client requests for matched lawyers.
Triggered when a user clicks "Connect me with a lawyer" after a query.
"""
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import uuid
import structlog

from app.supabase_client import get_service_client
from app.config import settings

logger = structlog.get_logger()


async def generate_request_summary(query_text: str) -> str:
    """
    Generate a 50-word lawyer-inbox-ready summary using Claude Haiku.
    Falls back to truncated query text if the LLM call fails.
    """
    if not query_text or len(query_text.strip()) < 10:
        return query_text.strip() if query_text else "No details provided."
    
    try:
        import httpx
        
        # Try OpenAI (GPT-4o-mini as Haiku equivalent)
        if settings.openai_api_key:
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-4o-mini",
                        "max_tokens": 80,
                        "messages": [
                            {
                                "role": "system",
                                "content": (
                                    "Summarize this legal situation in 50 words for a lawyer's inbox. "
                                    "Third person. No names. Professional tone. No markdown or bullet points."
                                )
                            },
                            {"role": "user", "content": query_text[:1000]}
                        ]
                    },
                    timeout=10.0
                )
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.warning(f"Summary generation failed: {e}")
    
    # Fallback: truncate to ~50 words
    words = query_text.strip().split()
    return " ".join(words[:50]) + ("..." if len(words) > 50 else "")


def find_matching_lawyers(
    client,
    category: str,
    user_city: Optional[str] = None,
    user_language: Optional[str] = None,
    limit: int = 3
) -> List[dict]:
    """
    Find top matching verified, available lawyers for a client request.
    Scoring: specialisation match > same city > language match > available
    """
    # Start with verified + available lawyers
    query = client.table("lawyers") \
        .select("id, auth_id, full_name, specialisations, city, languages, is_available") \
        .eq("is_verified", True) \
        .eq("is_available", True) \
        .limit(20)
    
    res = query.execute()
    lawyers = res.data or []
    
    if not lawyers:
        # Fallback: try without is_available filter
        query = client.table("lawyers") \
            .select("id, auth_id, full_name, specialisations, city, languages, is_available") \
            .eq("is_verified", True) \
            .limit(20)
        res = query.execute()
        lawyers = res.data or []
    
    if not lawyers:
        return []
    
    # Score each lawyer
    scored = []
    for l in lawyers:
        score = 0
        specs = [s.lower() for s in (l.get("specialisations") or [])]
        langs = [lang.lower() for lang in (l.get("languages") or [])]
        
        # Specialisation match (highest weight)
        if category.lower() in specs:
            score += 50
        
        # Same city
        if user_city and l.get("city", "").lower() == user_city.lower():
            score += 30
        
        # Language match
        if user_language and user_language.lower() in langs:
            score += 10
        
        # Available bonus
        if l.get("is_available"):
            score += 10
        
        scored.append({**l, "_score": score})
    
    # Sort by score descending, take top N
    scored.sort(key=lambda x: x["_score"], reverse=True)
    return scored[:limit]


async def create_client_requests(
    query_log_id: Optional[str],
    category: str,
    user_city: str,
    user_language: str,
    urgency: str,
    situation_summary: Optional[str],
    user_auth_id: Optional[str] = None,
) -> List[str]:
    """
    Create client_request rows for matched lawyers and send notifications.
    Returns list of created request IDs.
    """
    client = get_service_client()
    
    # 1. Find matching lawyers
    matched = find_matching_lawyers(client, category, user_city, user_language)
    
    if not matched:
        logger.warning(f"No matching lawyers found for category={category}, city={user_city}")
        return []
    
    # 2. Generate summary if not provided
    if not situation_summary:
        # Try to fetch query text from query_logs
        query_text = ""
        if query_log_id:
            try:
                log_res = client.table("query_logs") \
                    .select("query_text") \
                    .eq("id", query_log_id) \
                    .execute()
                if log_res.data:
                    query_text = log_res.data[0].get("query_text", "")
            except Exception:
                pass
        
        situation_summary = await generate_request_summary(query_text or f"Legal inquiry about {category}")
    
    # 3. Create one request per matched lawyer
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=48)
    created_ids = []
    
    for lawyer in matched:
        req_id = str(uuid.uuid4())
        try:
            client.table("client_requests").insert({
                "id": req_id,
                "lawyer_id": lawyer["id"],
                "user_auth_id": user_auth_id,
                "query_log_id": query_log_id,
                "category": category,
                "situation_summary": situation_summary,
                "user_city": user_city,
                "user_language": user_language,
                "urgency": urgency,
                "status": "pending",
                "created_at": now.isoformat(),
                "expires_at": expires.isoformat(),
            }).execute()
            created_ids.append(req_id)
            
            # 4. Create notification for this lawyer
            try:
                urgency_prefix = "🔴 Urgent: " if urgency == "urgent" else ""
                client.table("lawyer_notifications").insert({
                    "lawyer_auth_id": lawyer["auth_id"],
                    "type": "new_request",
                    "title": f"{urgency_prefix}New client request",
                    "body": f"A potential client in {user_city} needs help with {category}. Respond within 48 hours.",
                    "metadata": {"request_id": req_id, "category": category},
                }).execute()
            except Exception as e:
                logger.warning(f"Failed to create notification for lawyer {lawyer['id']}: {e}")
                
        except Exception as e:
            logger.error(f"Failed to create client_request for lawyer {lawyer['id']}: {e}")
    
    return created_ids
