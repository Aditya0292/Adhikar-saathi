-- Enable extensions first:
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
