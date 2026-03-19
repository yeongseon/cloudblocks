from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import cast

import pytest
from httpx import AsyncClient

from app.core.dependencies import get_key_manager
from app.core.security import generate_id
from app.domain.models.ai_entities import AIApiKey
from app.domain.models.entities import User
from app.infrastructure.db.connection import Database
from app.infrastructure.db.repositories import SQLiteAIApiKeyRepository
from app.infrastructure.llm.client import OpenAIClient
from app.infrastructure.llm.key_manager import KeyManager


async def _store_openai_key(db: Database, user_id: str) -> None:
    key_manager = cast(KeyManager, get_key_manager())
    encrypted_key = key_manager.encrypt("sk-test-openai")
    api_key = AIApiKey(
        id=generate_id(),
        user_id=user_id,
        provider="openai",
        encrypted_key=encrypted_key,
        created_at=datetime.now(timezone.utc),
    )
    _ = await SQLiteAIApiKeyRepository(db).upsert(api_key)


@pytest.mark.asyncio
async def test_generate_success(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    test_user: User,
    db: Database,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _store_openai_key(db, test_user.id)

    architecture: dict[str, object] = {
        "plates": [],
        "blocks": [],
        "connections": [],
        "externalActors": [],
    }

    async def mock_generate(
        self: OpenAIClient,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, object] | None = None,
    ) -> dict[str, object]:
        _ = self
        _ = response_schema
        assert "Complexity target" in system_prompt
        assert user_prompt == "build architecture"
        return architecture

    monkeypatch.setattr(OpenAIClient, "generate", mock_generate)

    response = await client.post(
        "/api/v1/ai/generate",
        cookies=auth_cookies,
        json={"prompt": "build architecture", "provider": "aws", "complexity": "simple"},
    )

    assert response.status_code == 200
    payload = cast(dict[str, object], json.loads(response.text))
    assert payload["architecture"] == architecture
    assert payload["warnings"] == []


@pytest.mark.asyncio
async def test_generate_no_auth(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/ai/generate",
        json={"prompt": "build architecture", "provider": "aws", "complexity": "simple"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_generate_no_api_key(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    response = await client.post(
        "/api/v1/ai/generate",
        cookies=auth_cookies,
        json={"prompt": "build architecture", "provider": "aws", "complexity": "simple"},
    )

    assert response.status_code == 400
    payload = cast(dict[str, object], json.loads(response.text))
    error_payload = cast(dict[str, object], payload["error"])
    assert error_payload["message"] == (
        "No OpenAI API key stored. Please add one via /api/v1/ai/keys"
    )


@pytest.mark.asyncio
async def test_suggest_returns_empty_stub(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    response = await client.post(
        "/api/v1/ai/suggest",
        cookies=auth_cookies,
        json={"architecture": {}},
    )

    assert response.status_code == 200
    assert response.json() == {"suggestions": [], "score": {}}


@pytest.mark.asyncio
async def test_suggest_no_auth(client: AsyncClient) -> None:
    response = await client.post("/api/v1/ai/suggest", json={"architecture": {}})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"
