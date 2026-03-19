from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.infrastructure.db.repositories import SQLiteAIApiKeyRepository


@pytest.mark.asyncio
async def test_post_ai_keys_without_auth_returns_401(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/ai/keys",
        json={"provider": "openai", "key": "sk-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_post_ai_keys_with_auth_stores_encrypted_key(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    test_user,
    db,
) -> None:
    response = await client.post(
        "/api/v1/ai/keys",
        cookies=auth_cookies,
        json={"provider": "openai", "key": "sk-secret-value"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["provider"] == "openai"
    assert payload["created_at"]

    keys = await SQLiteAIApiKeyRepository(db).list_by_user(test_user.id)
    assert len(keys) == 1
    assert keys[0].provider == "openai"
    assert keys[0].encrypted_key != "sk-secret-value"


@pytest.mark.asyncio
async def test_get_ai_keys_returns_provider_list_without_keys(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    save = await client.post(
        "/api/v1/ai/keys",
        cookies=auth_cookies,
        json={"provider": "openai", "key": "sk-first"},
    )
    assert save.status_code == 200

    response = await client.get("/api/v1/ai/keys", cookies=auth_cookies)

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) == 1
    assert payload[0]["provider"] == "openai"
    assert payload[0]["created_at"]
    assert "key" not in payload[0]
    assert "encrypted_key" not in payload[0]


@pytest.mark.asyncio
async def test_delete_ai_key_removes_provider_key(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    save = await client.post(
        "/api/v1/ai/keys",
        cookies=auth_cookies,
        json={"provider": "openai", "key": "sk-delete-me"},
    )
    assert save.status_code == 200

    delete = await client.delete("/api/v1/ai/keys/openai", cookies=auth_cookies)

    assert delete.status_code == 200
    assert delete.json() == {"provider": "openai", "deleted": True}


@pytest.mark.asyncio
async def test_get_ai_keys_after_delete_returns_empty_list(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    save = await client.post(
        "/api/v1/ai/keys",
        cookies=auth_cookies,
        json={"provider": "openai", "key": "sk-delete-check"},
    )
    assert save.status_code == 200

    delete = await client.delete("/api/v1/ai/keys/openai", cookies=auth_cookies)
    assert delete.status_code == 200

    response = await client.get("/api/v1/ai/keys", cookies=auth_cookies)

    assert response.status_code == 200
    assert response.json() == []
