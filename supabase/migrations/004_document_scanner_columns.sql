-- ─────────────────────────────────────────────────────────
-- ADD DOCUMENT SCANNER COLUMNS TO DOCUMENTS TABLE
-- ─────────────────────────────────────────────────────────

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS document_type TEXT,
ADD COLUMN IF NOT EXISTS document_language TEXT,
ADD COLUMN IF NOT EXISTS ocr_confidence DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS is_handwritten BOOLEAN,
ADD COLUMN IF NOT EXISTS risk_tier TEXT,
ADD COLUMN IF NOT EXISTS risk_summary TEXT,
ADD COLUMN IF NOT EXISTS critical_dates JSONB,
ADD COLUMN IF NOT EXISTS legal_references JSONB,
ADD COLUMN IF NOT EXISTS suggest_lawyer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0;
