"""CloudBlocks API - Core configuration."""

from dataclasses import dataclass, field
import os


@dataclass
class Settings:
    """Application settings loaded from environment variables."""

    # Application
    app_env: str = field(default_factory=lambda: os.getenv("APP_ENV", "development"))
    app_port: int = field(default_factory=lambda: int(os.getenv("APP_PORT", "8000")))
    app_debug: bool = field(default_factory=lambda: os.getenv("APP_DEBUG", "true").lower() == "true")

    # GitHub Integration
    github_app_id: str = field(default_factory=lambda: os.getenv("GITHUB_APP_ID", ""))
    github_client_id: str = field(default_factory=lambda: os.getenv("GITHUB_CLIENT_ID", ""))
    github_client_secret: str = field(default_factory=lambda: os.getenv("GITHUB_CLIENT_SECRET", ""))

    # Redis
    redis_host: str = field(default_factory=lambda: os.getenv("REDIS_HOST", "localhost"))
    redis_port: int = field(default_factory=lambda: int(os.getenv("REDIS_PORT", "6379")))
    redis_password: str = field(default_factory=lambda: os.getenv("REDIS_PASSWORD", ""))

    # JWT
    jwt_secret: str = field(default_factory=lambda: os.getenv("JWT_SECRET", "change-me"))
    jwt_expiration: int = field(default_factory=lambda: int(os.getenv("JWT_EXPIRATION", "3600")))

    # Object Storage
    storage_endpoint: str = field(default_factory=lambda: os.getenv("STORAGE_ENDPOINT", "http://localhost:9000"))
    storage_access_key: str = field(default_factory=lambda: os.getenv("STORAGE_ACCESS_KEY", "minioadmin"))
    storage_secret_key: str = field(default_factory=lambda: os.getenv("STORAGE_SECRET_KEY", "minioadmin"))
    storage_bucket: str = field(default_factory=lambda: os.getenv("STORAGE_BUCKET", "cloudblocks"))

    # Supabase (auth metadata)
    supabase_url: str = field(default_factory=lambda: os.getenv("SUPABASE_URL", ""))
    supabase_anon_key: str = field(default_factory=lambda: os.getenv("SUPABASE_ANON_KEY", ""))


settings = Settings()
