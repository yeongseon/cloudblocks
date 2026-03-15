from __future__ import annotations

import os
from unittest.mock import patch

import pytest

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


def test_settings_rejects_weak_jwt_secret_in_production() -> None:
    env = {
        "CLOUDBLOCKS_APP_ENV": "production",
        "CLOUDBLOCKS_JWT_SECRET": "change-me-in-production",
    }
    with (
        patch.dict(os.environ, env, clear=True),
        pytest.raises(ValueError, match="JWT secret is too weak"),
    ):
        Settings()


def test_settings_rejects_short_jwt_secret_in_staging() -> None:
    env = {
        "CLOUDBLOCKS_APP_ENV": "staging",
        "CLOUDBLOCKS_JWT_SECRET": "short",
    }
    with (
        patch.dict(os.environ, env, clear=True),
        pytest.raises(ValueError, match="JWT secret is too weak"),
    ):
        Settings()


def test_settings_accepts_strong_jwt_secret_in_production() -> None:
    env = {
        "CLOUDBLOCKS_APP_ENV": "production",
        "CLOUDBLOCKS_JWT_SECRET": "a-very-strong-secret-that-is-at-least-32-chars-long",
    }
    with patch.dict(os.environ, env, clear=True):
        cfg = Settings()
    assert cfg.jwt_secret == "a-very-strong-secret-that-is-at-least-32-chars-long"


def test_settings_allows_weak_jwt_secret_in_development() -> None:
    env = {
        "CLOUDBLOCKS_APP_ENV": "development",
        "CLOUDBLOCKS_JWT_SECRET": "change-me-in-production",
    }
    with patch.dict(os.environ, env, clear=True):
        cfg = Settings()
    assert cfg.jwt_secret == "change-me-in-production"
