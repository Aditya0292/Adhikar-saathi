# NyayaSatya — YOUR Prompt (Updated)
## Supabase Auth + DB · Dual Auth Flows · Indian Lawyer Verification · Responsive Web
**Your scope only | May 2026 | Cursor / Windsurf + Stitch MCP**

---

## WHAT CHANGED FROM PREVIOUS PROMPT

| Old | New |
|-----|-----|
| Clerk auth | Supabase Auth |
| Single auth flow | Two separate flows: User + Lawyer |
| Generic lawyer registration | India-specific lawyer verification docs |
| Mobile app mention | Web only, but fully responsive (mobile-clean) |
| No Stitch MCP | Use Stitch MCP for frontend UI generation |

---

## MASTER CONTEXT BLOCK
> Paste before every layer in your IDE.

```
You are building NyayaSatya MVP — an Indian legal advisory platform.

YOUR STACK:
- Backend: FastAPI (Python 3.11), Supabase (PostgreSQL + pgvector + Auth + Storage), Redis, Pydantic v2, structlog
- Frontend: React 18, TypeScript strict, Vite, Tailwind CSS, TanStack Query v5, Zustand, Supabase JS client
- Auth: Supabase Auth — two separate flows: (1) general users, (2) lawyers (with document verification)
- Deploy: Railway (backend) + Vercel (frontend)
- Design: Web-first, fully responsive — must look clean on mobile browser without being a native app

Rules:
1. Never call AI/RAG services directly from routes — go through service interface stubs
2. Supabase client is the single source of truth for auth tokens — never roll your own JWT
3. Pydantic v2 everywhere on backend — structlog never print()
4. TypeScript strict — no 'any'
5. Every input validated both client-side (React Hook Form + Zod) and server-side (Pydantic)
6. Responsive-first: every component must work at 320px width and at 1440px width
```

---

## LAWYER VERIFICATION — WHAT INDIA REQUIRES

> This section informs the entire lawyer registration flow. Read before building.

To legally practise law in India, a lawyer must have completed either a 3-year LLB or a 5-year integrated BA LLB from a BCI-approved university, enrolled with their State Bar Council, and passed the All India Bar Examination (AIBE) to receive a Certificate of Practice.

**The 3 proofs that make a lawyer legit on our platform:**

### PROOF 1 — Bar Council Enrollment Number + Certificate
- Every enrolled advocate has a unique Enrollment Number (format: `STATE/YYYY/NNNNN` e.g. `MH/2019/34521`)
- Once approved by the State Bar Council, the advocate receives an Enrollment Certificate with their Enrollment Number. This certifies them as an Advocate under the relevant Bar Council.
- We collect: enrollment number (text) + scanned enrollment certificate (PDF/image upload)

### PROOF 2 — Certificate of Practice (COP)
- Candidates whose names appear on the Roll of Advocates maintained by a State Bar Council and who have passed the All India Bar Examination receive a Certificate of Practice — a mandatory document to practice law in India.
- We collect: COP document upload (PDF/image)
- Note: Lawyers enrolled before 2010 may not have AIBE COP — we accept enrollment certificate alone for senior lawyers (10+ years experience field)

### PROOF 3 — Government Photo ID
- Aadhaar Card (preferred — 12-digit UID)
- OR Voter ID
- OR Passport
- Aadhaar number is collected as text (last 4 digits shown, rest masked) + front/back upload

**What we do NOT verify in MVP (manual admin review instead):**
- Bar Council database lookup (no public API exists)
- LLB degree cross-check with universities
- AIBE roll number verification

**Our verification workflow:**
1. Lawyer submits registration form + uploads 3 documents
2. All documents go to Supabase Storage (private bucket)
3. Admin gets Slack notification
4. Admin reviews in admin panel → clicks "Verify" or "Reject with reason"
5. Lawyer gets email notification via Supabase Auth email templates

---

## SUPABASE SETUP

```
[MASTER CONTEXT BLOCK]

Before writing any code, set up Supabase project structure.

Create a new Supabase project at supabase.com. Then configure:

1. Auth providers to enable:
   - Email + Password (primary for both users and lawyers)
   - Google OAuth (for users only — lawyers use email only for professional trust)
   - Phone OTP (optional, for rural users without email)

2. Email templates to customize in Supabase dashboard:
   - User confirmation: "Welcome to NyayaSatya — confirm your email to start asking legal questions"
   - Lawyer confirmation: "NyayaSatya Lawyer Registration — please confirm your email. Document verification takes 24-48 hours."
   - Password reset: standard but branded
   - Lawyer approval (custom — trigger via Edge Function): "Congratulations! Your lawyer profile on NyayaSatya has been verified."
   - Lawyer rejection (custom): "Your NyayaSatya lawyer application needs attention: {reason}"

3. Supabase Storage buckets:
   - "lawyer-documents" — PRIVATE bucket (only service role can read)
     * enrollment-certificates/
     * certificates-of-practice/
     * government-ids/
   - "lawyer-photos" — PUBLIC bucket (profile photos, readable by all)
   - "user-documents" — PRIVATE bucket (for document scanner feature)

4. Supabase Auth custom claims (set via database trigger):
   - user_role: "user" | "lawyer" | "admin"
   - lawyer_verified: boolean (only on lawyer accounts)
   These go into the JWT so your FastAPI backend can read them without a DB call.

Generate:
- supabase/config.toml (local dev config)
- supabase/migrations/001_schema.sql (all tables)
- supabase/migrations/002_rls.sql (Row Level Security policies)
- supabase/migrations/003_triggers.sql (custom JWT claims trigger)
- supabase/seed.sql (10 sample lawyers for local testing)
```

---

## LAYER 1 — Database Schema (Supabase PostgreSQL)

```
[MASTER CONTEXT BLOCK]

Generate supabase/migrations/001_schema.sql

Enable extensions first:
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for text search on lawyer names

-- ─────────────────────────────────────────────────────────
-- USERS TABLE
-- Links to Supabase Auth (auth.users) via user_id
-- ─────────────────────────────────────────────────────────
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'en',
    subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
    query_count_today INTEGER NOT NULL DEFAULT 0,
    query_reset_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- LAWYERS TABLE
-- Separate from users — a lawyer IS a special kind of user
-- but has a completely different auth flow and profile
-- ─────────────────────────────────────────────────────────
CREATE TABLE public.lawyers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic info
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    profile_photo_url TEXT,
    bio TEXT CHECK (char_length(bio) <= 500),
    
    -- Bar Council verification (THE CORE of lawyer legitimacy)
    bar_enrollment_number TEXT UNIQUE NOT NULL,
    -- Format: STATE_CODE/YEAR/NUMBER e.g. MH/2019/34521
    -- Validate: regex ^[A-Z]{2,4}\/\d{4}\/\d{3,6}$
    state_bar_council TEXT NOT NULL,
    -- Which state bar council they're enrolled with
    -- Options: Delhi, Maharashtra & Goa, Karnataka, Tamil Nadu, Kerala, etc.
    enrollment_year INTEGER NOT NULL CHECK (enrollment_year >= 1961 AND enrollment_year <= EXTRACT(YEAR FROM NOW())),
    
    -- Document upload paths (stored in Supabase Storage private bucket)
    enrollment_certificate_path TEXT,    -- PROOF 1: mandatory
    certificate_of_practice_path TEXT,  -- PROOF 2: mandatory for lawyers enrolled post-2010
    government_id_path TEXT,            -- PROOF 3: mandatory (Aadhaar/Voter ID/Passport)
    government_id_type TEXT CHECK (government_id_type IN ('aadhaar', 'voter_id', 'passport')),
    government_id_last4 TEXT CHECK (char_length(government_id_last4) = 4),
    
    -- Verification status
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verification_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'under_review', 'verified', 'rejected')),
    rejection_reason TEXT,          -- filled when rejected, shown to lawyer
    verified_at TIMESTAMPTZ,
    verified_by UUID,               -- admin user id who verified
    
    -- Professional details
    specialisations TEXT[] NOT NULL DEFAULT '{}',
    -- Valid values: 'criminal', 'civil', 'family', 'labour', 'consumer', 'property', 'constitutional', 'corporate', 'taxation', 'ip', 'cyber', 'immigration'
    court_jurisdictions TEXT[] DEFAULT '{}',
    -- e.g. ['Bombay High Court', 'Mumbai District Court', 'Thane District Court']
    experience_years INTEGER NOT NULL CHECK (experience_years >= 0 AND experience_years <= 60),
    languages TEXT[] NOT NULL DEFAULT '{}'
        CHECK (array_length(languages, 1) >= 1),
    -- Must specify at least one language
    
    -- Location
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT CHECK (pincode ~ '^\d{6}$'),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    
    -- Fees
    fee_per_hour_inr INTEGER NOT NULL CHECK (fee_per_hour_inr >= 0),
    -- 0 = free legal aid lawyer
    offers_free_consultation BOOLEAN NOT NULL DEFAULT false,
    
    -- Platform metrics (computed by background jobs)
    average_rating DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (average_rating >= 0 AND average_rating <= 5),
    total_reviews INTEGER NOT NULL DEFAULT 0,
    response_rate DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (response_rate >= 0 AND response_rate <= 1),
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lawyer search
CREATE INDEX idx_lawyers_verified ON public.lawyers(is_verified, is_active);
CREATE INDEX idx_lawyers_city_state ON public.lawyers(city, state);
CREATE INDEX idx_lawyers_specialisations ON public.lawyers USING gin(specialisations);
CREATE INDEX idx_lawyers_enrollment_number ON public.lawyers(bar_enrollment_number);
CREATE INDEX idx_lawyers_name_trgm ON public.lawyers USING gin(full_name gin_trgm_ops);

-- ─────────────────────────────────────────────────────────
-- QUERY LOGS TABLE
-- ─────────────────────────────────────────────────────────
CREATE TABLE public.query_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    query_text TEXT NOT NULL,
    query_language TEXT NOT NULL DEFAULT 'en',
    mode TEXT NOT NULL CHECK (mode IN ('fast', 'verified')),
    response_text TEXT NOT NULL,
    citations JSONB,
    latency_ms INTEGER,
    hallucination_guard_passed BOOLEAN,
    was_helpful BOOLEAN,
    needs_lawyer BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_query_logs_user ON public.query_logs(user_auth_id, created_at DESC);
CREATE INDEX idx_query_logs_session ON public.query_logs(session_id);

-- ─────────────────────────────────────────────────────────
-- DOCUMENTS TABLE (for doc scanner feature)
-- ─────────────────────────────────────────────────────────
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_auth_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    content_type TEXT NOT NULL,
    processing_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (processing_status IN ('pending', 'processing', 'done', 'failed')),
    -- Fields below filled by friend's AI service
    ocr_text TEXT,
    summary TEXT,
    risk_score DOUBLE PRECISION CHECK (risk_score >= 0 AND risk_score <= 1),
    risk_flags JSONB,
    key_clauses JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- LAWYER REVIEWS TABLE
-- ─────────────────────────────────────────────────────────
CREATE TABLE public.lawyer_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lawyer_id UUID NOT NULL REFERENCES public.lawyers(id) ON DELETE CASCADE,
    user_auth_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT CHECK (char_length(review_text) <= 500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(lawyer_id, user_auth_id)  -- one review per user per lawyer
);
```

---

## LAYER 2 — Row Level Security + Auth Triggers

```
[MASTER CONTEXT BLOCK]

Generate supabase/migrations/002_rls.sql

Enable RLS on all tables:
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyer_reviews ENABLE ROW LEVEL SECURITY;

Policies:

-- USERS table
-- Users can only read/write their own row
CREATE POLICY "users_own_read" ON public.users FOR SELECT USING (auth.uid() = auth_id);
CREATE POLICY "users_own_update" ON public.users FOR UPDATE USING (auth.uid() = auth_id);
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- LAWYERS table
-- Verified lawyers are publicly readable (for search)
-- Lawyers can only update their own non-verification fields
CREATE POLICY "lawyers_public_read" ON public.lawyers FOR SELECT USING (is_verified = true AND is_active = true);
CREATE POLICY "lawyers_own_read" ON public.lawyers FOR SELECT USING (auth.uid() = auth_id);
-- Lawyers can update their own profile but NOT verification fields
CREATE POLICY "lawyers_own_update" ON public.lawyers FOR UPDATE
    USING (auth.uid() = auth_id)
    WITH CHECK (
        auth.uid() = auth_id
        AND verification_status = verification_status  -- cannot change own status
        AND is_verified = is_verified                  -- cannot self-verify
    );
CREATE POLICY "lawyers_insert_own" ON public.lawyers FOR INSERT WITH CHECK (auth.uid() = auth_id);
-- Service role (backend) can do everything — for admin verification actions
CREATE POLICY "service_role_all" ON public.lawyers FOR ALL USING (auth.role() = 'service_role');

-- QUERY LOGS
CREATE POLICY "query_logs_own" ON public.query_logs FOR ALL USING (auth.uid() = user_auth_id);
CREATE POLICY "query_logs_insert_anon" ON public.query_logs FOR INSERT WITH CHECK (true); -- allow anonymous logs

-- DOCUMENTS
CREATE POLICY "documents_own" ON public.documents FOR ALL USING (auth.uid() = user_auth_id);

-- LAWYER REVIEWS
CREATE POLICY "reviews_public_read" ON public.lawyer_reviews FOR SELECT USING (true);
CREATE POLICY "reviews_own_write" ON public.lawyer_reviews FOR INSERT WITH CHECK (auth.uid() = user_auth_id);

Generate supabase/migrations/003_triggers.sql

-- ─────────────────────────────────────────────────────────
-- TRIGGER 1: Auto-create user profile row on signup
-- When someone signs up via Supabase Auth, create their users row
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Check if this is a lawyer signup (metadata set during registration)
    -- Users have metadata: {"role": "user"} OR {"role": "lawyer"}
    IF NEW.raw_user_meta_data->>'role' = 'lawyer' THEN
        -- Lawyers get their own table row (lawyers table)
        -- But we don't insert here — lawyer registration form does that
        -- We just set the custom claim
        NULL;
    ELSE
        -- Regular user
        INSERT INTO public.users (auth_id, email, preferred_language)
        VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en'));
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────
-- TRIGGER 2: Set custom JWT claims (user_role, lawyer_verified)
-- This runs on every auth token refresh
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE
    claims JSONB;
    user_role TEXT;
    lawyer_is_verified BOOLEAN;
BEGIN
    claims := event->'claims';
    
    -- Check if this auth_id exists in lawyers table
    SELECT verification_status = 'verified'
    INTO lawyer_is_verified
    FROM public.lawyers
    WHERE auth_id = (event->>'user_id')::UUID;
    
    IF FOUND THEN
        claims := jsonb_set(claims, '{user_role}', '"lawyer"');
        claims := jsonb_set(claims, '{lawyer_verified}', to_jsonb(COALESCE(lawyer_is_verified, false)));
    ELSE
        claims := jsonb_set(claims, '{user_role}', '"user"');
        claims := jsonb_set(claims, '{lawyer_verified}', 'false');
    END IF;
    
    -- Check admin (you manually set this in Supabase dashboard for your admin account)
    IF (event->'claims'->>'is_admin')::BOOLEAN = true THEN
        claims := jsonb_set(claims, '{user_role}', '"admin"');
    END IF;
    
    RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- ─────────────────────────────────────────────────────────
-- TRIGGER 3: Update lawyer average_rating when review added
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_lawyer_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.lawyers
    SET
        average_rating = (SELECT AVG(rating) FROM public.lawyer_reviews WHERE lawyer_id = NEW.lawyer_id),
        total_reviews = (SELECT COUNT(*) FROM public.lawyer_reviews WHERE lawyer_id = NEW.lawyer_id),
        updated_at = NOW()
    WHERE id = NEW.lawyer_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_review_added
    AFTER INSERT OR UPDATE ON public.lawyer_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_lawyer_rating();

-- ─────────────────────────────────────────────────────────
-- TRIGGER 4: updated_at auto-update
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_lawyers_updated_at BEFORE UPDATE ON public.lawyers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

---

## LAYER 3 — Backend Auth + Supabase Client

```
[MASTER CONTEXT BLOCK]

Replace all Clerk references with Supabase. Build the FastAPI Supabase integration.

FILE: backend/app/config.py

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str    # Server-side only — never expose to frontend
    supabase_jwt_secret: str          # From Supabase dashboard → Settings → API → JWT Secret

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Rate limiting
    max_free_queries_per_day: int = 5

    # Feature flags
    fast_mode_enabled: bool = True
    verified_mode_enabled: bool = False
    doc_scanner_enabled: bool = False

    # Storage
    max_upload_size_mb: int = 10

    # Alerts
    slack_webhook_url: str = ""

FILE: backend/app/supabase_client.py

from supabase import create_client, Client
from app.config import settings

# Two clients:
# 1. anon_client — for operations that should respect RLS (user context)
# 2. service_client — for admin operations that bypass RLS (admin verification, background jobs)

def get_anon_client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_anon_key)

def get_service_client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)

FILE: backend/app/dependencies.py

from jose import jwt, JWTError
from fastapi import Request, HTTPException, Depends
from app.config import settings
import structlog

logger = structlog.get_logger()

async def get_current_user(request: Request) -> dict | None:
    """
    Verifies Supabase JWT from Authorization header.
    Returns the decoded JWT claims dict or None if anonymous.
    Claims include: sub (auth_id), email, user_role, lawyer_verified
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1]
    try:
        claims = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},  # Supabase doesn't use standard aud
        )
        return claims
    except JWTError as e:
        logger.warning("jwt_verification_failed", error=str(e))
        return None

async def require_user(user: dict | None = Depends(get_current_user)) -> dict:
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.get("user_role") == "lawyer" and not user.get("lawyer_verified"):
        raise HTTPException(status_code=403, detail="Lawyer account pending verification")
    return user

async def require_lawyer(user: dict | None = Depends(get_current_user)) -> dict:
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.get("user_role") != "lawyer":
        raise HTTPException(status_code=403, detail="Lawyer account required")
    if not user.get("lawyer_verified"):
        raise HTTPException(status_code=403, detail="Your lawyer profile is pending verification. We'll notify you within 24-48 hours.")
    return user

async def require_admin(user: dict | None = Depends(get_current_user)) -> dict:
    if user is None or user.get("user_role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def check_rate_limit(
    request: Request,
    user: dict | None = Depends(get_current_user),
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
```

---

## LAYER 4 — Lawyer Registration API (The Most Critical Route You Own)

```
[MASTER CONTEXT BLOCK]

Build the complete lawyer registration API. This is the most complex route you own.
Two-phase flow: (1) Account creation with Supabase Auth, (2) Document upload.

FILE: backend/app/api/v1/lawyer_auth.py

INDIAN STATE BAR COUNCILS (hardcoded list for dropdown validation):
STATE_BAR_COUNCILS = [
    "Bar Council of Delhi",
    "Bar Council of Maharashtra & Goa",
    "Bar Council of Karnataka",
    "Bar Council of Tamil Nadu",
    "Bar Council of Kerala",
    "Bar Council of Andhra Pradesh",
    "Bar Council of Telangana",
    "Bar Council of Gujarat",
    "Bar Council of Rajasthan",
    "Bar Council of Punjab & Haryana",
    "Bar Council of Uttar Pradesh",
    "Bar Council of West Bengal",
    "Bar Council of Madhya Pradesh",
    "Bar Council of Bihar",
    "Bar Council of Odisha",
    "Bar Council of Assam, Nagaland, Mizoram, & Arunachal Pradesh",
    "Bar Council of Himachal Pradesh",
    "Bar Council of Uttarakhand",
    "Bar Council of Jharkhand",
    "Bar Council of Chhattisgarh",
    "Bar Council of Jammu & Kashmir",
]

LawyerRegistrationStep1 Pydantic model (text fields — no file uploads):
    full_name: str = Field(min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)  -- validated: min 8 chars, at least 1 number
    phone: str | None = Field(None, pattern=r"^\+91[0-9]{10}$")  -- Indian phone format
    
    -- Bar Council fields
    bar_enrollment_number: str = Field(
        pattern=r"^[A-Z]{1,4}/\d{4}/\d{3,6}$",
        description="Format: STATE/YEAR/NUMBER e.g. MH/2019/34521"
    )
    state_bar_council: str  -- must be in STATE_BAR_COUNCILS list
    enrollment_year: int = Field(ge=1961, le=2025)
    
    -- Professional fields
    specialisations: list[str] = Field(min_length=1, max_length=5)
    -- Each must be in: ['criminal','civil','family','labour','consumer','property','constitutional','corporate','taxation','ip','cyber','immigration']
    court_jurisdictions: list[str] = Field(default=[])
    experience_years: int = Field(ge=0, le=60)
    languages: list[str] = Field(min_length=1)
    -- Each must be in allowed language list
    
    -- Location
    city: str = Field(min_length=2, max_length=100)
    state: str
    pincode: str = Field(pattern=r"^\d{6}$")
    
    -- Fees
    fee_per_hour_inr: int = Field(ge=0, le=100000)
    offers_free_consultation: bool = False
    
    -- Government ID
    government_id_type: Literal["aadhaar", "voter_id", "passport"]
    government_id_last4: str = Field(pattern=r"^\d{4}$")
    -- We only store last 4 digits — full number is never stored, only ID document image

POST /api/v1/lawyers/register/step1:
    No auth required (this creates the account)
    
    Flow:
    1. Validate LawyerRegistrationStep1
    2. Check bar_enrollment_number not already in lawyers table (unique)
    3. Create Supabase Auth user:
       supabase.auth.sign_up({
           email: data.email,
           password: data.password,
           options: {
               data: {"role": "lawyer", "full_name": data.full_name}
           }
       })
    4. Get the new auth_id from Supabase response
    5. Insert into public.lawyers table with all text fields, is_verified=False, verification_status='pending'
    6. Return: {lawyer_id, message: "Account created. Please upload your verification documents.", next_step: "/register/documents"}
    
    Errors to handle:
    - Email already exists in Supabase Auth → 409 "Email already registered"
    - bar_enrollment_number already exists → 409 "This enrollment number is already registered"
    - Supabase Auth error → 500 with sanitized message

POST /api/v1/lawyers/register/step2/documents:
    Auth: require valid JWT (lawyer just created in step 1)
    Content-Type: multipart/form-data
    
    Accepts 3 files:
    - enrollment_certificate: UploadFile (PDF or image, max 5MB, required)
    - certificate_of_practice: UploadFile (PDF or image, max 5MB, required if enrollment_year >= 2010)
    - government_id: UploadFile (PDF or image, max 5MB, required)
    
    Flow:
    1. Validate files (magic bytes check, size limit, type check)
    2. For each file:
       a. Generate storage path: f"lawyer-documents/{document_type}/{lawyer_auth_id}/{uuid4()}.{ext}"
       b. Upload to Supabase Storage "lawyer-documents" bucket (PRIVATE) using service client
    3. Update lawyers table: set all 3 document paths
    4. Update verification_status to 'under_review'
    5. Send Slack alert: "🔔 New lawyer registration: {full_name}, {bar_enrollment_number}, {city}. Review at /admin/lawyers"
    6. Return: {message: "Documents uploaded successfully. Verification takes 24-48 hours. We'll notify you by email."}
    
    File validation:
    - PDF magic bytes: b"%PDF"
    - JPEG: b"\xff\xd8\xff"
    - PNG: b"\x89PNG"
    - Reject anything else

GET /api/v1/lawyers/me/status:
    Auth: require valid JWT where user_role = "lawyer"
    Return: {verification_status, rejection_reason (if rejected), is_verified}
    Use this for the "pending verification" dashboard page

ADMIN ROUTES:

GET /api/v1/admin/lawyers/pending:
    Auth: require_admin
    Return all lawyers where verification_status IN ('pending', 'under_review')
    For each: include all fields + generate presigned URLs for all 3 documents (valid 1 hour)
    -- Admin clicks links to view documents in a new tab

PATCH /api/v1/admin/lawyers/{lawyer_id}/verify:
    Auth: require_admin
    Body: {"action": "approve" | "reject", "rejection_reason": str | None}
    
    If approve:
    - Set is_verified=True, verification_status='verified', verified_at=NOW(), verified_by=admin_auth_id
    - Send email via Supabase (trigger email Edge Function or use Supabase Edge Functions)
    
    If reject:
    - Set verification_status='rejected', rejection_reason=body.rejection_reason
    - rejection_reason is REQUIRED when rejecting — validates min 10 chars
    - Lawyer can re-submit documents after rejection
    
    Return: 200 with updated lawyer

PATCH /api/v1/admin/lawyers/{lawyer_id}/reset-for-resubmission:
    Auth: require_admin
    Allows rejected lawyer to re-upload documents
    Set verification_status='pending', clear document paths
```

---

## LAYER 5 — User Auth + Profile Routes

```
[MASTER CONTEXT BLOCK]

Build user auth routes. Users have a simpler flow than lawyers.

FILE: backend/app/api/v1/user_auth.py

SUPPORTED LANGUAGES = {
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

NOTE: User accounts are created directly via Supabase Auth on the FRONTEND.
The frontend calls supabase.auth.signUp() directly.
The database trigger (handle_new_user) auto-creates the public.users row.
So you only need backend routes for profile management, not account creation.

GET /api/v1/users/me:
    Auth: require_user
    Fetch from public.users WHERE auth_id = user["sub"]
    Return full user profile

PATCH /api/v1/users/me:
    Auth: require_user
    Body: UpdateUserRequest
        preferred_language: str | None -- must be in SUPPORTED_LANGUAGES keys
    Update public.users table
    Return updated user

GET /api/v1/users/me/query-history:
    Auth: require_user
    Return query_logs WHERE user_auth_id = user["sub"]
    Paginated: ?page=1&page_size=20
    Return: {items: list[QueryLogSummary], total, page, page_size}
    QueryLogSummary: {id, query_text (truncated 100 chars), mode, was_helpful, created_at}

GET /api/v1/users/me/documents:
    Auth: require_user
    Return documents WHERE user_auth_id = user["sub"]
    Include: id, original_filename, processing_status, risk_score, created_at

DELETE /api/v1/users/me/account:
    Auth: require_user
    Soft delete: set is_active=False on users table
    Note: Supabase Auth account deletion requires service client
    Use service_client.auth.admin.delete_user(user["sub"])
    Also delete all their documents from Supabase Storage
    Return 204
```

---

## LAYER 6 — Frontend: Supabase Client + Auth Flows

```
[MASTER CONTEXT BLOCK]

Build complete frontend auth with Supabase. Two completely separate auth flows.

FILE: src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'  -- generated from Supabase CLI

export const supabase = createClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
)

// Helper to get current session JWT for API calls
export async function getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
}

// Generate Database types:
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
// Include this command in README

FILE: src/stores/useAuthStore.ts (Zustand)

interface AuthState {
    user: User | null           -- from public.users table
    lawyer: Lawyer | null       -- from public.lawyers table
    session: Session | null     -- Supabase session
    role: 'user' | 'lawyer' | 'admin' | null
    isLoading: boolean
    isVerifiedLawyer: boolean
    
    setSession: (session: Session | null) => void
    fetchProfile: () => Promise<void>
    signOut: () => Promise<void>
}

On app init:
    supabase.auth.onAuthStateChange((event, session) => {
        store.setSession(session)
        if (session) store.fetchProfile()
    })

FILE: src/pages/auth/UserSignUp.tsx

Simple Supabase email signup for regular users.
Fields: email, password, confirm password, preferred language (dropdown)
On submit:
    await supabase.auth.signUp({
        email, password,
        options: { data: { role: 'user', preferred_language: language } }
    })
Show: "Check your email to confirm your account"
Also offer: "Sign up with Google" button → supabase.auth.signInWithOAuth({ provider: 'google' })

FILE: src/pages/auth/UserSignIn.tsx

Email + password form
Google OAuth button
"Forgot password" link → triggers supabase.auth.resetPasswordForEmail()
Link to lawyer sign-in: "Are you a lawyer? Sign in here →"

FILE: src/pages/auth/LawyerSignIn.tsx

Separate page — visually distinct (more formal look)
Email + password only (no Google OAuth for lawyers — professional context)
Link to registration: "New to NyayaSatya? Register as a Lawyer →"
After sign-in: if lawyer_verified=false → redirect to /lawyer/pending

FILE: src/pages/auth/LawyerRegister.tsx — MOST COMPLEX FRONTEND PAGE

This is a 3-step wizard. Use react-hook-form + zod for validation.

STEP 1 — Account & Bar Council Details:

Section: "Your Account"
    Email (EmailStr validation)
    Password (min 8 chars, at least 1 number — show strength indicator)
    Confirm Password

Section: "Bar Council Registration" (show info tooltip explaining what each field means)
    Bar Enrollment Number
        Input with placeholder: "MH/2019/34521"
        Format hint: "STATE_CODE/YEAR/NUMBER (from your Enrollment Certificate)"
        Real-time format validation as they type
    State Bar Council (dropdown — all 22 Indian State Bar Councils listed)
    Year of Enrollment (dropdown — 1961 to current year)

Section: "Professional Details"
    Full Name
    Phone (optional, +91 format)
    Experience (years — number input)
    Specialisations (multi-select checkboxes with icons):
        ⚖️ Criminal Law    👨‍👩‍👧 Family Law    💼 Labour & Employment
        🏠 Property Law    🛒 Consumer Law   📋 Civil Law
        🏛️ Constitutional  🏢 Corporate      💰 Taxation
        💡 Intellectual Property  💻 Cyber Law  ✈️ Immigration
    Languages (multi-select — same 10 Indian languages)
    Court Jurisdictions (text input with tag-style add — "Type and press Enter")

Section: "Location & Fees"
    City (text)
    State (dropdown — Indian states)
    Pincode (6 digits)
    Consultation Fee (INR per hour — number, 0 = free)
    "I offer free initial consultation" checkbox

STEP 2 — Document Upload (after account created in step 1):

Show a clear explanation panel at top:
"To verify you as a registered advocate in India, we need 3 documents.
All documents are stored securely and reviewed only by our admin team."

Document 1: Bar Council Enrollment Certificate (MANDATORY)
    - Label: "Bar Council Enrollment Certificate"
    - Description: "The certificate issued by your State Bar Council with your Enrollment Number"
    - Upload zone: drag & drop or click, accept PDF/JPG/PNG, max 5MB
    - Show preview thumbnail on upload
    - Status: ✅ Uploaded / ⬜ Required

Document 2: Certificate of Practice — AIBE (conditional)
    - Show only if enrollment_year >= 2010
    - Label: "Certificate of Practice (AIBE)"
    - Description: "Issued by Bar Council of India after clearing the All India Bar Examination"
    - If enrollment_year < 2010: show "Not required for advocates enrolled before 2010" with grey lock icon

Document 3: Government Photo ID (MANDATORY)
    - Label: "Government Photo ID"
    - Description: "Aadhaar Card, Voter ID, or Passport"
    - ID Type selector (radio buttons): 📱 Aadhaar  🗳️ Voter ID  🛂 Passport
    - Last 4 digits of ID number (text field — we never store the full number)
    - Upload zone: "Upload front side" + "Upload back side (optional for Passport)"

Submit button: "Submit for Verification →"
On submit: POST to /api/v1/lawyers/register/step2/documents (multipart form)

STEP 3 — Confirmation:
    ✅ Big green checkmark
    "Documents submitted successfully!"
    "Our team will verify your profile within 24-48 hours."
    "You'll receive an email at {email} when approved."
    "Questions? Email us at verify@nyayasatya.in"

FILE: src/pages/lawyer/LawyerPendingPage.tsx

Shown to lawyers who are logged in but not yet verified.
Shows: verification_status badge (Pending / Under Review / Rejected)
If rejected: shows rejection_reason with red alert + "Re-submit Documents" button
If pending/under_review: shows estimated timeline
Cannot access any other lawyer features until verified
```

---

## LAYER 7 — Frontend Components (Responsive Web)

```
[MASTER CONTEXT BLOCK]

Build all frontend UI components. Web-first, fully responsive.
Must work cleanly at 320px (small Android), 375px (iPhone SE), 768px (tablet), 1280px (desktop).
No mobile app — but mobile browser must be excellent.

RESPONSIVE DESIGN RULES:
- Use CSS Grid and Flexbox — no fixed pixel widths
- Tailwind breakpoints: sm:640px, md:768px, lg:1024px, xl:1280px
- Touch targets minimum 44x44px (no tiny clickable areas)
- Font sizes: never below 14px on mobile
- No horizontal scroll at any breakpoint
- Test every component at 320px width

FILE: tailwind.config.ts

theme extend:
    colors:
        primary: {
            50: '#e8f5e9', 100: '#c8e6c9', 200: '#a5d6a7',
            500: '#2D6A4F', DEFAULT: '#1B4332', 900: '#081C15'
        }
        accent: {
            DEFAULT: '#D4AF37', light: '#F4D35E', dark: '#B8960C'
        }
        legal: {
            red: '#C62828',    -- for criminal law badges
            blue: '#1565C0',   -- for civil/corporate
            purple: '#6A1B9A', -- for constitutional
            orange: '#E65100', -- for labour
            teal: '#00695C',   -- for consumer
        }
    fontFamily:
        sans: ['Noto Sans', 'sans-serif']
        -- Add to index.html: Google Fonts Noto Sans (weights 400,500,600,700)
        -- Also add: Noto Sans Devanagari, Noto Sans Tamil, Noto Sans Telugu
        -- This ensures Hindi/Tamil/Telugu text renders properly

FILE: src/components/layout/Navbar.tsx

Mobile (< md):
    - Logo left
    - Hamburger menu right
    - Slide-in drawer on hamburger tap (overlay, from left)
    - Drawer contains: nav links + sign in/out

Desktop (>= md):
    - Logo left
    - Nav links center: "Ask a Question" | "Find a Lawyer" | "For Lawyers"
    - Right: if signed in → avatar + dropdown (Profile, Sign out) | if not → "Sign In" + "Register as Lawyer"

Active link: underline in accent gold color

FILE: src/components/query/QueryBox.tsx

Mobile adaptations:
    - Full-width textarea (no side margins on mobile)
    - Language selector: compact icon-based selector that expands to modal on mobile
    - Submit button: full width on mobile, normal width on desktop
    - Character counter: shown only when > 1500 chars (reduces clutter on mobile)
    
Desktop:
    - Language selector as regular dropdown inline
    - Submit button right-aligned

FILE: src/components/query/AnswerPanel.tsx

Mobile:
    - Citations open as bottom sheet modal (slides up from bottom) when "View Citations" tapped
    - Thumbs up/down + copy: row of icon buttons below answer
    - "Find a Lawyer" banner: full width yellow bar

Desktop:
    - Citations panel slides in from right (2-column layout)

FILE: src/components/lawyer/LawyerCard.tsx

Mobile:
    - Compact card (less info visible by default)
    - Tap card → expands to show full details
    - "Call" and "Directions" as icon buttons (no label text, tooltips on long-press)

Desktop:
    - Full card always visible
    - Hover effects
    - Inline "Call" and "Get Directions" buttons with labels

FILE: src/components/lawyer/LawyerSearch.tsx

Contains: search input + filters + results grid

Mobile:
    - Search bar full width
    - "Filters" button → opens filter bottom sheet
    - Results: single column cards
    - "Use my location" as icon button in search bar

Desktop:
    - Filter sidebar (left column, 280px wide)
    - Results: 2-column grid
    - Location button inline in search bar

Filters available:
    - Specialisation (multi-select chips)
    - City / State (text + dropdown)
    - Max fee (range slider: Free → ₹10,000/hr)
    - Languages (multi-select)
    - "Available now" toggle
    - Experience: 0-5 yrs / 5-10 yrs / 10+ yrs

FILE: src/components/document/DocUpload.tsx

Mobile:
    - Large "📷 Take Photo" button + "📄 Upload File" button (side by side)
    - Camera: use accept="image/*;capture=environment" on input
    - No drag & drop on mobile (doesn't work well)

Desktop:
    - Dashed drag & drop zone (full width)
    - + "or click to browse" text
    - Drag hover state: border turns solid accent gold

FILE: src/components/ui/LanguageSelector.tsx

Reusable component used in QueryBox AND user profile.
Options rendered with native script name:
    en → "English"
    hi → "हिन्दी (Hindi)"
    ta → "தமிழ் (Tamil)"
    te → "తెలుగు (Telugu)"
    bn → "বাংলা (Bengali)"
    mr → "मराठी (Marathi)"
    gu → "ગુજરાતી (Gujarati)"
    kn → "ಕನ್ನಡ (Kannada)"
    ml → "മലയാളം (Malayalam)"
    pa → "ਪੰਜਾਬੀ (Punjabi)"

Mobile: opens as bottom sheet with large tap targets
Desktop: standard select dropdown

FILE: src/pages/Home.tsx

Mobile layout:
    Hero section:
        - Logo centered
        - Headline: "Legal answers for every Indian"
        - Subtext (short, 1 line on mobile)
        - ModeToggle (two full-width buttons stacked or side by side at sm)
    QueryBox: full width
    AnswerPanel: full width below
    Lawyer strip (if needs_lawyer): horizontal scroll of LawyerCards

Desktop layout:
    Hero: centered with max-width container
    QueryBox: max-width 800px centered
    AnswerPanel: if citations → 2-column (answer + citations sidebar)
    Lawyer strip: 3-column grid

FILE: src/pages/LawyerFinder.tsx

Mobile:
    - Search bar sticks to top when scrolling (sticky)
    - Filters hidden by default, "Filter" button opens bottom sheet
    - Results as full-width cards in single column

Desktop:
    - Left sidebar with filters (sticky)
    - Right area with results grid

FILE: src/components/admin/LawyerVerificationPanel.tsx

Admin-only panel (accessible only when user_role = 'admin').
Route: /admin/verify-lawyers

For each pending lawyer:
    - Name, enrollment number, state bar council, city
    - Documents: three buttons "View Enrollment Certificate", "View COP", "View ID"
        → each opens document in a new tab via presigned URL from backend
    - "✅ Approve" button (green)
    - "❌ Reject" button (red) → opens modal asking for rejection_reason text (required, min 10 chars)
    - Rejection reason is sent to lawyer by email

Mobile: same layout, document buttons stack vertically.
```

---

## LAYER 8 — File Structure Creation Commands

```
[MASTER CONTEXT BLOCK]

Generate a shell script that creates the COMPLETE file structure.
Save as: setup.sh
Run: bash setup.sh from project root.

#!/bin/bash
set -e

echo "Creating NyayaSatya project structure..."

# Root
mkdir -p .github/workflows

# Supabase
mkdir -p supabase/migrations supabase/functions/send-lawyer-email

# Backend
mkdir -p backend/app/{api/v1,services,middleware,background,utils}
mkdir -p backend/tests
mkdir -p backend/alembic/versions

# Touch all backend files
touch backend/app/__init__.py
touch backend/app/main.py
touch backend/app/config.py
touch backend/app/database.py  # only if needed — Supabase replaces most of this
touch backend/app/supabase_client.py
touch backend/app/dependencies.py
touch backend/app/api/__init__.py
touch backend/app/api/v1/__init__.py
touch backend/app/api/v1/query.py
touch backend/app/api/v1/lawyer_auth.py
touch backend/app/api/v1/user_auth.py
touch backend/app/api/v1/documents.py
touch backend/app/api/v1/health.py
touch backend/app/services/__init__.py
touch backend/app/services/fast_mode.py       # FRIEND fills this
touch backend/app/services/verified_mode.py   # FRIEND fills this
touch backend/app/services/doc_service.py     # FRIEND fills this
touch backend/app/services/lawyer_service.py  # YOU fill this
touch backend/app/middleware/__init__.py
touch backend/app/middleware/rate_limit.py
touch backend/app/middleware/request_id.py
touch backend/app/background/__init__.py
touch backend/app/background/tasks.py
touch backend/app/utils/__init__.py
touch backend/app/utils/geo.py
touch backend/app/utils/file_validation.py
touch backend/tests/conftest.py
touch backend/tests/test_auth.py
touch backend/tests/test_lawyer_registration.py
touch backend/tests/test_query_routes.py
touch backend/pyproject.toml
touch backend/Dockerfile
touch backend/.env.example

# Frontend
mkdir -p frontend/src/{lib,types,api,stores,hooks,components/{layout,query,lawyer,document,admin,ui},pages/{auth,lawyer,admin}}
mkdir -p frontend/public

# Touch all frontend files
touch frontend/src/main.tsx
touch frontend/src/App.tsx
touch frontend/src/lib/supabase.ts
touch frontend/src/lib/database.types.ts    # generated by Supabase CLI
touch frontend/src/types/index.ts
touch frontend/src/api/client.ts
touch frontend/src/api/query.ts
touch frontend/src/api/lawyer.ts
touch frontend/src/api/user.ts
touch frontend/src/stores/useAuthStore.ts
touch frontend/src/stores/useQueryStore.ts
touch frontend/src/hooks/useGeoLocation.ts
touch frontend/src/hooks/useSSE.ts
touch frontend/src/components/layout/Navbar.tsx
touch frontend/src/components/layout/Layout.tsx
touch frontend/src/components/query/ModeToggle.tsx
touch frontend/src/components/query/QueryBox.tsx
touch frontend/src/components/query/AnswerPanel.tsx
touch frontend/src/components/query/CitationCard.tsx
touch frontend/src/components/lawyer/LawyerCard.tsx
touch frontend/src/components/lawyer/LawyerSearch.tsx
touch frontend/src/components/document/DocUpload.tsx
touch frontend/src/components/document/DocResult.tsx
touch frontend/src/components/admin/LawyerVerificationPanel.tsx
touch frontend/src/components/ui/LanguageSelector.tsx
touch frontend/src/components/ui/Button.tsx
touch frontend/src/components/ui/Badge.tsx
touch frontend/src/components/ui/Spinner.tsx
touch frontend/src/components/ui/BottomSheet.tsx   # for mobile modals
touch frontend/src/components/ui/Toast.tsx
touch frontend/src/pages/Home.tsx
touch frontend/src/pages/LawyerFinder.tsx
touch frontend/src/pages/Profile.tsx
touch frontend/src/pages/auth/UserSignUp.tsx
touch frontend/src/pages/auth/UserSignIn.tsx
touch frontend/src/pages/auth/LawyerSignIn.tsx
touch frontend/src/pages/auth/LawyerRegister.tsx
touch frontend/src/pages/lawyer/LawyerPendingPage.tsx
touch frontend/src/pages/lawyer/LawyerDashboard.tsx
touch frontend/src/pages/admin/AdminVerify.tsx
touch frontend/index.html
touch frontend/vite.config.ts
touch frontend/tailwind.config.ts
touch frontend/tsconfig.json
touch frontend/package.json
touch frontend/.env.example

# Corpus (friend's territory — just placeholder)
mkdir -p corpus
touch corpus/README.md

# CI/CD
touch .github/workflows/ci.yml
touch .github/workflows/deploy.yml

touch .gitignore
touch docker-compose.yml
touch README.md

echo "✅ Done. Now run: git init && git add . && git commit -m 'chore: initial project structure' && git push"
```

---

## STITCH MCP USAGE GUIDE

```
Since you have Stitch MCP connected in your IDE, use it for frontend component generation.

BEST PROMPTS FOR STITCH MCP:

For LawyerRegister.tsx (3-step wizard):
"Create a 3-step form wizard in React with Tailwind CSS for Indian lawyer registration.
Step 1: Account details (email, password) + Bar Council details (enrollment number with format MH/2019/34521, state bar council dropdown with all 22 Indian state bar councils, enrollment year).
Step 2: File upload for 3 documents — enrollment certificate, certificate of practice (conditional on year >= 2010), government ID with type selector (Aadhaar/Voter ID/Passport).
Step 3: Success confirmation.
Mobile-first design. Dark green (#1B4332) primary, gold (#D4AF37) accent."

For LawyerCard.tsx:
"Create a lawyer profile card component in React + Tailwind.
Shows: name, specialisation badges (color-coded: criminal=red, family=pink, labour=blue, property=green, consumer=teal), distance in km, experience years, hourly fee in INR (formatted as ₹2,000), languages, rating stars.
Two buttons: Call (tel: link) and Directions (Google Maps link).
Mobile-first: compact on mobile, full detail on desktop."

For LanguageSelector.tsx:
"Create a language selector component in React + Tailwind with these 10 Indian languages shown in their native script: English, हिन्दी, தமிழ், తెలుగు, বাংলা, मराठी, ગુજરાતી, ಕನ್ನಡ, മലയാളം, ਪੰਜਾਬੀ.
On mobile: opens as a bottom sheet. On desktop: standard dropdown. Dark green theme."

For AdminVerify panel:
"Create an admin verification panel in React + Tailwind.
Shows a list of pending lawyer applications with: name, bar enrollment number, state, submission date.
Each row has: View Enrollment Certificate button, View COP button, View ID button (all open in new tab), Approve button (green), Reject button (red — opens modal for rejection reason).
Clean table layout on desktop, card layout on mobile."

Use Stitch for the VISUAL layer only.
All API calls, auth logic, and state management — you write manually.
```

---

## YOUR ENVIRONMENT VARIABLES

```env
# ── BACKEND (.env in /backend) ────────────────────────────

# Supabase (get from: supabase.com → Your Project → Settings → API)
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...          # Safe to use client-side
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # NEVER expose this — backend only
SUPABASE_JWT_SECRET=              # Settings → API → JWT Secret

# Redis
REDIS_URL=redis://localhost:6379/0

# Rate limits
MAX_FREE_QUERIES_PER_DAY=5

# Feature flags (your friend enables these when their services are ready)
FAST_MODE_ENABLED=true
VERIFIED_MODE_ENABLED=false
DOC_SCANNER_ENABLED=false

# Alerts
SLACK_WEBHOOK_URL=

# ── FRONTEND (.env in /frontend) ──────────────────────────

VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...     # Same anon key — safe for frontend
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_MAPS_KEY=             # For lawyer location map (optional MVP)
```

---

## YOUR BUILD ORDER

```
Day 1 AM:  Run setup.sh → git init → push to GitHub → share with friend
Day 1 PM:  Supabase project setup — create project, configure Auth, run all 3 migrations

Day 2 AM:  Layer 3 — Supabase client + FastAPI dependencies (auth works)
Day 2 PM:  Layer 4 — Lawyer registration API (Step 1 + Step 2 + admin routes)

Day 3 AM:  Layer 5 — User auth routes
Day 3 PM:  Layer 6 — Frontend auth flows (UserSignUp, UserSignIn, LawyerSignIn)
           Use Stitch MCP for LawyerRegister.tsx (most complex form)

Day 4 AM:  Layer 1+2 — DB Schema + RLS (do in Supabase SQL editor)
Day 4 PM:  Layer 7 — All frontend components
           Use Stitch MCP for LawyerCard, LanguageSelector, AdminVerify

Day 5:     Wire everything up — query routes call friend's stub services
           Test complete flows: user signup → query, lawyer register → admin verify

Day 6:     Deploy backend to Railway, frontend to Vercel
           Share staging URL with friend
```

---

## API CONTRACT FOR YOUR FRIEND (unchanged)

```python
# These 3 files are in your repo — friend implements the methods

# app/services/fast_mode.py
class FastModeService:
    async def answer(self, query: str, language: str, session_id: str) -> FastModeResponse: ...
    async def stream(self, query: str, language: str, session_id: str): ...  # yields str tokens

# app/services/verified_mode.py
class VerifiedModeService:
    async def answer(self, query: str, language: str, session_id: str) -> VerifiedModeResponse: ...
    async def stream(self, query: str, language: str, session_id: str): ...

# app/services/doc_service.py
class DocService:
    async def process(self, document_id: str, storage_path: str) -> None:
        # Must update: documents.processing_status, .summary, .risk_score, .risk_flags, .key_clauses
        ...
```

---

*NyayaSatya — Your Prompt v2 | Supabase + Dual Auth + Indian Lawyer Verification + Responsive Web*
*Run setup.sh first. Push. Then start Layer 3.*
