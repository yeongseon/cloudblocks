"""CloudBlocks API - Core configuration using pydantic-settings."""

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_env: str = "development"
    app_port: int = 8000
    app_debug: bool = True

    # GitHub App OAuth
    github_app_id: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = "http://localhost:8000/api/v1/auth/github/callback"

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_seconds: int = 3600  # 1 hour
    jwt_refresh_expiration_seconds: int = 86400 * 7  # 7 days
    token_encryption_salt: str = "cloudblocks-default-salt"

    # Database
    database_url: str = "sqlite+aiosqlite:///cloudblocks.db"

    # CORS
    cors_origins: list[str] = ["http://localhost:5173"]

    # Session / Cookie
    session_cookie_name: str = "cb_session"
    session_cookie_domain: str | None = None
    session_cookie_secure: bool = False  # True in production
    session_cookie_path: str = "/api"
    session_ttl_hours: int = 24 * 7  # 7 days
    oauth_state_ttl_minutes: int = 10
    oauth_cookie_name: str = "cb_oauth"
    frontend_url: str = "http://localhost:5173"

    model_config = {"env_prefix": "CLOUDBLOCKS_", "env_file": ".env", "extra": "ignore"}

    _WEAK_SECRETS: set[str] = {"change-me-in-production", "secret", "password", ""}
    _WEAK_SALTS: set[str] = {"cloudblocks-default-salt", "salt", "default", ""}

    @model_validator(mode="after")
    def _validate_secrets_strength(self) -> "Settings":
        if self.app_env != "development":
            if self.jwt_secret in self._WEAK_SECRETS or len(self.jwt_secret) < 32:
                raise ValueError(
                    f"JWT secret is too weak for env '{self.app_env}'. "
                    "Set CLOUDBLOCKS_JWT_SECRET to a random string of at least 32 characters."
                )
            salt_weak = (
                self.token_encryption_salt in self._WEAK_SALTS
                or len(self.token_encryption_salt) < 16
            )
            if salt_weak:
                raise ValueError(
                    f"Token encryption salt is too weak for env '{self.app_env}'. "
                    "Set CLOUDBLOCKS_TOKEN_ENCRYPTION_SALT to a"
                    " random string of at least 16 characters."
                )
        return self


settings = Settings()
