from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token, generate_id
from app.domain.models.entities import User
from app.infrastructure.db.repositories import SQLiteUserRepository


async def _create_other_user_auth(db) -> dict[str, str]:
    repo = SQLiteUserRepository(db)
    other_user = User(
        id=generate_id(),
        github_id="67890",
        github_username="other-user",
        email="other@example.com",
        display_name="Other User",
    )
    created = await repo.create(other_user)
    return {"Authorization": f"Bearer {create_access_token(created.id)}"}


@pytest.mark.asyncio
async def test_list_workspaces_returns_empty_for_new_user(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    response = await client.get("/api/v1/workspaces/", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == {"workspaces": []}


@pytest.mark.asyncio
async def test_list_workspaces_returns_created_workspaces(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    await client.post(
        "/api/v1/workspaces/",
        headers=auth_headers,
        json={"name": "Workspace A"},
    )
    await client.post(
        "/api/v1/workspaces/",
        headers=auth_headers,
        json={"name": "Workspace B", "generator": "pulumi", "provider": "aws"},
    )

    response = await client.get("/api/v1/workspaces/", headers=auth_headers)

    assert response.status_code == 200
    payload = response.json()["workspaces"]
    assert len(payload) == 2
    names = {item["name"] for item in payload}
    assert names == {"Workspace A", "Workspace B"}


@pytest.mark.asyncio
async def test_create_workspace_with_minimal_body_returns_201(
    client: AsyncClient,
    auth_headers: dict[str, str],
    test_user,
) -> None:
    response = await client.post(
        "/api/v1/workspaces/",
        headers=auth_headers,
        json={"name": "Minimal Workspace"},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["name"] == "Minimal Workspace"
    assert payload["owner_id"] == test_user.id
    assert payload["generator"] == "terraform"
    assert payload["provider"] == "azure"


@pytest.mark.asyncio
async def test_create_workspace_with_all_fields_returns_201(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    response = await client.post(
        "/api/v1/workspaces/",
        headers=auth_headers,
        json={
            "name": "Full Workspace",
            "generator": "bicep",
            "provider": "azure",
            "github_repo": "acme/platform-infra",
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["name"] == "Full Workspace"
    assert payload["generator"] == "bicep"
    assert payload["provider"] == "azure"
    assert payload["github_repo"] == "acme/platform-infra"


@pytest.mark.asyncio
async def test_create_workspace_without_auth_returns_401(client: AsyncClient) -> None:
    response = await client.post("/api/v1/workspaces/", json={"name": "Denied"})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_get_workspace_returns_workspace_for_owner(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    created = await client.post(
        "/api/v1/workspaces/",
        headers=auth_headers,
        json={"name": "Owned Workspace"},
    )
    workspace_id = created.json()["id"]

    response = await client.get(f"/api/v1/workspaces/{workspace_id}", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["id"] == workspace_id


@pytest.mark.asyncio
async def test_get_workspace_non_existent_returns_404(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    response = await client.get("/api/v1/workspaces/does-not-exist", headers=auth_headers)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_get_workspace_of_other_user_returns_403(
    client: AsyncClient,
    auth_headers: dict[str, str],
    db,
) -> None:
    created = await client.post(
        "/api/v1/workspaces/",
        headers=auth_headers,
        json={"name": "Private Workspace"},
    )
    workspace_id = created.json()["id"]
    other_headers = await _create_other_user_auth(db)

    response = await client.get(f"/api/v1/workspaces/{workspace_id}", headers=other_headers)

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_get_workspace_without_auth_returns_401(client: AsyncClient) -> None:
    response = await client.get("/api/v1/workspaces/some-id")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_update_workspace_name_returns_200(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    created = await client.post(
        "/api/v1/workspaces/",
        headers=auth_headers,
        json={"name": "Before"},
    )
    workspace_id = created.json()["id"]

    response = await client.put(
        f"/api/v1/workspaces/{workspace_id}",
        headers=auth_headers,
        json={"name": "After"},
    )

    assert response.status_code == 200
    assert response.json()["name"] == "After"


@pytest.mark.asyncio
async def test_update_workspace_multiple_fields_returns_200(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    created = await client.post(
        "/api/v1/workspaces/",
        headers=auth_headers,
        json={"name": "Original"},
    )
    workspace_id = created.json()["id"]

    response = await client.put(
        f"/api/v1/workspaces/{workspace_id}",
        headers=auth_headers,
        json={
            "name": "Updated",
            "generator": "pulumi",
            "provider": "aws",
            "github_repo": "acme/updated",
            "github_branch": "develop",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["name"] == "Updated"
    assert payload["generator"] == "pulumi"
    assert payload["provider"] == "aws"
    assert payload["github_repo"] == "acme/updated"
    assert payload["github_branch"] == "develop"


@pytest.mark.asyncio
async def test_update_workspace_non_existent_returns_404(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    response = await client.put(
        "/api/v1/workspaces/missing-id",
        headers=auth_headers,
        json={"name": "Nope"},
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_update_workspace_not_owner_returns_403(
    client: AsyncClient,
    auth_headers: dict[str, str],
    db,
) -> None:
    created = await client.post(
        "/api/v1/workspaces/",
        headers=auth_headers,
        json={"name": "Owner Workspace"},
    )
    workspace_id = created.json()["id"]
    other_headers = await _create_other_user_auth(db)

    response = await client.put(
        f"/api/v1/workspaces/{workspace_id}",
        headers=other_headers,
        json={"name": "Should Fail"},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_delete_workspace_owned_returns_204(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    created = await client.post(
        "/api/v1/workspaces/",
        headers=auth_headers,
        json={"name": "Delete Me"},
    )
    workspace_id = created.json()["id"]

    response = await client.delete(f"/api/v1/workspaces/{workspace_id}", headers=auth_headers)

    assert response.status_code == 204

    get_response = await client.get(f"/api/v1/workspaces/{workspace_id}", headers=auth_headers)
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_delete_workspace_non_existent_returns_404(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    response = await client.delete("/api/v1/workspaces/missing-id", headers=auth_headers)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_delete_workspace_not_owner_returns_403(
    client: AsyncClient,
    auth_headers: dict[str, str],
    db,
) -> None:
    created = await client.post(
        "/api/v1/workspaces/",
        headers=auth_headers,
        json={"name": "Not Yours"},
    )
    workspace_id = created.json()["id"]
    other_headers = await _create_other_user_auth(db)

    response = await client.delete(f"/api/v1/workspaces/{workspace_id}", headers=other_headers)

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"
