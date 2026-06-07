-- Add availability status for live consult matchings
ALTER TABLE public.lawyers 
ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true;

-- Index for map availability searches
CREATE INDEX IF NOT EXISTS idx_lawyers_availability 
ON public.lawyers(is_available) 
WHERE is_verified = true AND is_active = true;
