from __future__ import annotations

from typing import Any

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token, generate_id
from app.domain.models.entities import User
from app.infrastructure.db.repositories import SQLiteUserRepository


async def _create_workspace(client: AsyncClient, auth_headers: dict[str, str]) -> dict[str, Any]:
    response = await client.post(
        "/api/v1/workspaces/",
        headers=auth_headers,
        json={"name": "Generation Workspace"},
    )
    assert response.status_code == 201
    return response.json()


async def _create_other_user_auth(db) -> dict[str, str]:
    repo = SQLiteUserRepository(db)
    other_user = User(
        id=generate_id(),
        github_id="22222",
        github_username="other-generator-user",
        email="other-generation@example.com",
        display_name="Other Generator User",
    )
    created = await repo.create(other_user)
    return {"Authorization": f"Bearer {create_access_token(created.id)}"}


@pytest.mark.asyncio
async def test_trigger_generation_returns_pending_run(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    workspace = await _create_workspace(client, auth_headers)

    response = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/generate",
        headers=auth_headers,
        json={"generator": "terraform", "provider": "azure"},
    )

    assert response.status_code == 202
    payload = response.json()
    assert payload["workspace_id"] == workspace["id"]
    assert payload["status"] == "pending"
    assert payload["generator"] == "terraform"
    assert payload["id"]


@pytest.mark.asyncio
async def test_trigger_generation_workspace_not_found_returns_404(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    response = await client.post(
        "/api/v1/workspaces/missing/generate",
        headers=auth_headers,
        json={"generator": "terraform", "provider": "azure"},
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_trigger_generation_not_owner_returns_403(
    client: AsyncClient,
    auth_headers: dict[str, str],
    db,
) -> None:
    workspace = await _create_workspace(client, auth_headers)
    other_headers = await _create_other_user_auth(db)

    response = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/generate",
        headers=other_headers,
        json={"generator": "terraform", "provider": "azure"},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_get_generation_status_returns_run(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    workspace = await _create_workspace(client, auth_headers)
    create_run = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/generate",
        headers=auth_headers,
        json={"generator": "terraform", "provider": "azure"},
    )
    run_id = create_run.json()["id"]

    response = await client.get(
        f"/api/v1/workspaces/{workspace['id']}/generate/{run_id}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == run_id
    assert payload["workspace_id"] == workspace["id"]
    assert payload["status"] == "pending"


@pytest.mark.asyncio
async def test_get_generation_status_run_not_found_returns_404(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    workspace = await _create_workspace(client, auth_headers)

    response = await client.get(
        f"/api/v1/workspaces/{workspace['id']}/generate/missing-run",
        headers=auth_headers,
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_get_generation_status_workspace_not_found_returns_404(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    response = await client.get(
        "/api/v1/workspaces/missing/generate/any-run",
        headers=auth_headers,
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_preview_generation_returns_placeholder(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    workspace = await _create_workspace(client, auth_headers)

    response = await client.get(
        f"/api/v1/workspaces/{workspace['id']}/preview",
        headers=auth_headers,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["workspace_id"] == workspace["id"]
    assert payload["files"] == []
    assert "Code preview" in payload["message"]


@pytest.mark.asyncio
async def test_preview_generation_workspace_not_found_returns_404(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    response = await client.get("/api/v1/workspaces/missing/preview", headers=auth_headers)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_preview_generation_not_owner_returns_403(
    client: AsyncClient,
    auth_headers: dict[str, str],
    db,
) -> None:
    workspace = await _create_workspace(client, auth_headers)
    other_headers = await _create_other_user_auth(db)

    response = await client.get(
        f"/api/v1/workspaces/{workspace['id']}/preview",
        headers=other_headers,
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"
