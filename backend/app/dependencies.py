from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import Request, HTTPException, Depends
from app.config import settings
import structlog
from typing import Optional, Dict, Any

from app.utils.redis_client import redis_client

async def get_redis():
    return redis_client

logger = structlog.get_logger()

async def get_current_user(request: Request) -> Optional[Dict[str, Any]]:
    """
    Verifies Supabase JWT. First tries local verification using SUPABASE_JWT_SECRET
    for speed, then falls back to Supabase Auth API if local verification fails.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1]
    try:
        # Extract the algorithm from the token header first
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")
        
        # Asymmetric signatures (ES256/RS256) require Supabase's public keys.
        # Direct them to the network fallback immediately and quietly.
        if alg in ["ES256", "RS256"]:
            raise ValueError(f"Asymmetric algorithm {alg} requires network verification")

        # Try local verification for symmetric HS256
        claims = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        return claims
    except Exception as local_err:
        # Only log warning for unexpected local validation errors (like actual signature/key issues)
        if "requires network verification" not in str(local_err):
            logger.warning("local_jwt_verification_failed", error=str(local_err))
        try:
            from app.supabase_client import get_service_client
            # Fallback to Supabase Auth API over the network
            res = get_service_client().auth.get_user(token)
            if not res or not res.user:
                return None
                
            # Extract claims without signature verification (since Supabase already verified it)
            claims = jwt.decode(token, "", options={"verify_signature": False, "verify_aud": False})
            return claims
        except Exception as network_err:
            logger.error("jwt_verification_failed", error=str(network_err))
            return None

async def require_user(user: Optional[Dict[str, Any]] = Depends(get_current_user)) -> Dict[str, Any]:
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    role = user.get("app_metadata", {}).get("user_role") or user.get("user_metadata", {}).get("role") or user.get("user_role")
    lawyer_verified = user.get("app_metadata", {}).get("lawyer_verified", False)
    
    if role == "lawyer" and not lawyer_verified:
        # In MVP we allow them to access their own status via specific routes
        pass
    return user

async def require_lawyer(user: Optional[Dict[str, Any]] = Depends(get_current_user)) -> Dict[str, Any]:
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    role = user.get("app_metadata", {}).get("user_role") or user.get("user_metadata", {}).get("role") or user.get("user_role")
    lawyer_verified = user.get("app_metadata", {}).get("lawyer_verified", False)
    
    if role != "lawyer":
        raise HTTPException(status_code=403, detail="Lawyer account required")
    if not lawyer_verified:
        raise HTTPException(status_code=403, detail="Your lawyer profile is pending verification. We'll notify you within 24-48 hours.")
    return user

async def require_admin(user: Optional[Dict[str, Any]] = Depends(get_current_user)) -> Dict[str, Any]:
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    role = user.get("app_metadata", {}).get("user_role") or user.get("user_metadata", {}).get("role") or user.get("user_role")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def check_rate_limit(
    request: Request,
    user: Optional[Dict[str, Any]] = Depends(get_current_user),
    redis = Depends(get_redis),
) -> None:
    if user:
        # Authenticated: check Supabase users table
        auth_id = user["sub"]
        key = f"query_count:{auth_id}"
        count = await redis.incr(key)
        if count == 1:
            # Set TTL to midnight IST (UTC+5:30)
            now_utc = datetime.utcnow()
            midnight_ist = (now_utc.replace(hour=18, minute=30, second=0)
                           + timedelta(days=1 if now_utc.hour >= 18 else 0))
            ttl = int((midnight_ist - now_utc).total_seconds())
            await redis.expire(key, ttl)
        limit = settings.max_free_queries_per_day
        if count > limit:
            raise HTTPException(
                status_code=429,
                detail={"message": "Daily query limit reached", "limit": limit, "used": count}
            )
    else:
        # Anonymous: IP-based
        ip = request.client.host
        key = f"anon_count:{ip}"
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, 86400)  # 24 hours
        if count > 3:
            raise HTTPException(status_code=429, detail="Sign in for more queries")
