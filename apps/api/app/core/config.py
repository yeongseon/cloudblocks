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

    # Database
    database_url: str = "sqlite+aiosqlite:///cloudblocks.db"

    # CORS
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = {"env_prefix": "CLOUDBLOCKS_", "env_file": ".env", "extra": "ignore"}

    _WEAK_SECRETS: set[str] = {"change-me-in-production", "secret", "password", ""}

    @model_validator(mode="after")
    def _validate_jwt_secret_strength(self) -> "Settings":
        if self.app_env != "development" and (
            self.jwt_secret in self._WEAK_SECRETS or len(self.jwt_secret) < 32
        ):
            raise ValueError(
                f"JWT secret is too weak for env '{self.app_env}'. "
                "Set CLOUDBLOCKS_JWT_SECRET to a random string of at least 32 characters."
            )
        return self


settings = Settings()
