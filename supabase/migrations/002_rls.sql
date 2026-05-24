-- Enable RLS on all tables:
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyer_reviews ENABLE ROW LEVEL SECURITY;

-- Policies:

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
