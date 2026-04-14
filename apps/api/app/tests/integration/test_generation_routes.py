from __future__ import annotations

import time
from typing import Any

import pytest
from httpx import AsyncClient

from app.core.security import generate_id, generate_session_token
from app.domain.models.entities import Session, User
from app.infrastructure.db.repositories import SQLiteSessionRepository, SQLiteUserRepository
from app.tests.helpers import with_cookies


async def _create_workspace(client: AsyncClient, auth_cookies: dict[str, str]) -> dict[str, Any]:
    response = await with_cookies(client, auth_cookies).post(
        "/api/v1/workspaces/",
        json={"name": "Generation Workspace"},
    )
    assert response.status_code == 201
    return response.json()


async def _create_other_user_cookies(db) -> dict[str, str]:
    repo = SQLiteUserRepository(db)
    other_user = User(
        id=generate_id(),
        github_id="22222",
        github_username="other-generator-user",
        email="other-generation@example.com",
        display_name="Other Generator User",
    )
    created = await repo.create(other_user)
    session_repo = SQLiteSessionRepository(db)
    token = generate_session_token()
    now = int(time.time())
    session = Session(
        id=token,
        user_id=created.id,
        created_at=now,
        expires_at=now + 7 * 24 * 3600,
    )
    await session_repo.create(session)
    return {"cb_session": token}


@pytest.mark.asyncio
async def test_trigger_generation_returns_pending_run(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    workspace = await _create_workspace(client, auth_cookies)

    response = await with_cookies(client, auth_cookies).post(
        f"/api/v1/workspaces/{workspace['id']}/generate",
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
    auth_cookies: dict[str, str],
) -> None:
    response = await with_cookies(client, auth_cookies).post(
        "/api/v1/workspaces/missing/generate",
        json={"generator": "terraform", "provider": "azure"},
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_trigger_generation_not_owner_returns_403(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    db,
) -> None:
    workspace = await _create_workspace(client, auth_cookies)
    other_cookies = await _create_other_user_cookies(db)

    response = await with_cookies(client, other_cookies).post(
        f"/api/v1/workspaces/{workspace['id']}/generate",
        json={"generator": "terraform", "provider": "azure"},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_get_generation_status_returns_run(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    workspace = await _create_workspace(client, auth_cookies)
    create_run = await with_cookies(client, auth_cookies).post(
        f"/api/v1/workspaces/{workspace['id']}/generate",
        json={"generator": "terraform", "provider": "azure"},
    )
    run_id = create_run.json()["id"]

    response = await with_cookies(client, auth_cookies).get(
        f"/api/v1/workspaces/{workspace['id']}/generate/{run_id}",
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == run_id
    assert payload["workspace_id"] == workspace["id"]
    assert payload["status"] == "pending"


@pytest.mark.asyncio
async def test_get_generation_status_run_not_found_returns_404(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    workspace = await _create_workspace(client, auth_cookies)

    response = await with_cookies(client, auth_cookies).get(
        f"/api/v1/workspaces/{workspace['id']}/generate/missing-run",
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_get_generation_status_workspace_not_found_returns_404(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    response = await with_cookies(client, auth_cookies).get(
        "/api/v1/workspaces/missing/generate/any-run",
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_preview_generation_returns_placeholder(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    workspace = await _create_workspace(client, auth_cookies)

    response = await with_cookies(client, auth_cookies).get(
        f"/api/v1/workspaces/{workspace['id']}/preview",
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["workspace_id"] == workspace["id"]
    assert payload["files"] == []
    assert "Code preview" in payload["message"]


@pytest.mark.asyncio
async def test_preview_generation_workspace_not_found_returns_404(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    response = await with_cookies(client, auth_cookies).get("/api/v1/workspaces/missing/preview")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_preview_generation_not_owner_returns_403(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    db,
) -> None:
    workspace = await _create_workspace(client, auth_cookies)
    other_cookies = await _create_other_user_cookies(db)

    response = await with_cookies(client, other_cookies).get(
        f"/api/v1/workspaces/{workspace['id']}/preview",
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"
