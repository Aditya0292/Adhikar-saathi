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
