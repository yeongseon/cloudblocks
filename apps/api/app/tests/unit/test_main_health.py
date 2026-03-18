from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.main import readiness_check


@pytest.mark.asyncio
async def test_readiness_check_includes_redis_ping_when_redis_backend(monkeypatch) -> None:
    db = SimpleNamespace(fetch_one=AsyncMock(return_value=1))
    redis_client = SimpleNamespace(client=SimpleNamespace(ping=AsyncMock(return_value=True)))

    monkeypatch.setattr("app.main.get_database", lambda: db)
    monkeypatch.setattr("app.main.get_redis_client", lambda: redis_client)
    monkeypatch.setattr("app.main.settings.session_backend", "redis")

    response = await readiness_check()

    assert response.status_code == 200
    assert db.fetch_one.await_count == 1
    assert redis_client.client.ping.await_count == 1


@pytest.mark.asyncio
async def test_readiness_check_returns_503_when_redis_backend_missing_client(monkeypatch) -> None:
    db = SimpleNamespace(fetch_one=AsyncMock(return_value=1))

    monkeypatch.setattr("app.main.get_database", lambda: db)
    monkeypatch.setattr("app.main.get_redis_client", lambda: None)
    monkeypatch.setattr("app.main.settings.session_backend", "redis")

    response = await readiness_check()

    assert response.status_code == 503


@pytest.mark.asyncio
async def test_readiness_check_skips_redis_for_non_redis_backend(monkeypatch) -> None:
    db = SimpleNamespace(fetch_one=AsyncMock(return_value=1))
    redis_client = SimpleNamespace(client=SimpleNamespace(ping=AsyncMock(return_value=True)))

    monkeypatch.setattr("app.main.get_database", lambda: db)
    monkeypatch.setattr("app.main.get_redis_client", lambda: redis_client)
    monkeypatch.setattr("app.main.settings.session_backend", "sqlite")

    response = await readiness_check()

    assert response.status_code == 200
    assert db.fetch_one.await_count == 1
    assert redis_client.client.ping.await_count == 0
