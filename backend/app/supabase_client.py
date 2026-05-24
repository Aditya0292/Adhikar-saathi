from supabase import create_client, Client
from app.config import settings

# Two clients:
# 1. anon_client — for operations that should respect RLS (user context)
# 2. service_client — for admin operations that bypass RLS (admin verification, background jobs)

def get_anon_client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_anon_key)

def get_service_client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
