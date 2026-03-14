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

    # CUBRID
    cubrid_host: str = field(default_factory=lambda: os.getenv("CUBRID_HOST", "localhost"))
    cubrid_port: int = field(default_factory=lambda: int(os.getenv("CUBRID_PORT", "33000")))
    cubrid_db: str = field(default_factory=lambda: os.getenv("CUBRID_DB", "cloudblocks"))
    cubrid_user: str = field(default_factory=lambda: os.getenv("CUBRID_USER", "dba"))
    cubrid_password: str = field(default_factory=lambda: os.getenv("CUBRID_PASSWORD", ""))

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


settings = Settings()
