from pydantic_settings import BaseSettings, SettingsConfigDict

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

    # Voice Services (optional API keys, fallback to mocks if empty)
    sarvam_api_key: str = ""
    openai_api_key: str = ""
    elevenlabs_api_key: str = ""
    anthropic_api_key: str = ""

settings = Settings()
