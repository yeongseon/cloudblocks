from __future__ import annotations

import os
from unittest.mock import patch

from app.core.config import Settings, settings


def test_settings_instantiation_with_defaults() -> None:
    with patch.dict(os.environ, {}, clear=True):
        cfg = Settings()

    assert cfg.app_env == "development"
    assert cfg.app_port == 8000
    assert cfg.app_debug is True
    assert cfg.github_app_id == ""
    assert cfg.github_client_id == ""
    assert cfg.github_client_secret == ""
    assert cfg.github_redirect_uri == "http://localhost:8000/api/v1/auth/github/callback"
    assert cfg.jwt_secret == "change-me-in-production"
    assert cfg.jwt_algorithm == "HS256"
    assert cfg.jwt_expiration_seconds == 3600
    assert cfg.jwt_refresh_expiration_seconds == 86400 * 7
    assert cfg.database_url == "sqlite+aiosqlite:///cloudblocks.db"
    assert cfg.cors_origins == ["http://localhost:5173"]


def test_settings_singleton_exists_and_is_settings_instance() -> None:
    assert settings is not None
    assert isinstance(settings, Settings)
