from __future__ import annotations

import time

import pytest
from httpx import AsyncClient

from app.core.security import generate_id, generate_session_token
from app.tests.helpers import with_cookies
from app.domain.models.entities import Session, User
from app.infrastructure.db.repositories import SQLiteSessionRepository, SQLiteUserRepository


async def _create_other_user_cookies(db) -> dict[str, str]:
    repo = SQLiteUserRepository(db)
    other_user = User(
        id=generate_id(),
        github_id="67890",
        github_username="other-user",
        email="other@example.com",
        display_name="Other User",
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
async def test_list_workspaces_returns_empty_for_new_user(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    response = await with_cookies(client, auth_cookies).get("/api/v1/workspaces/")

    assert response.status_code == 200
    assert response.json() == {"workspaces": []}


@pytest.mark.asyncio
async def test_list_workspaces_returns_created_workspaces(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    await with_cookies(client, auth_cookies).post("/api/v1/workspaces/", json={"name": "Workspace A"},)
    await with_cookies(client, auth_cookies).post("/api/v1/workspaces/", json={"name": "Workspace B", "generator": "pulumi", "provider": "aws"},)

    response = await with_cookies(client, auth_cookies).get("/api/v1/workspaces/")

    assert response.status_code == 200
    payload = response.json()["workspaces"]
    assert len(payload) == 2
    names = {item["name"] for item in payload}
    assert names == {"Workspace A", "Workspace B"}


@pytest.mark.asyncio
async def test_create_workspace_with_minimal_body_returns_201(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    test_user,
) -> None:
    response = await with_cookies(client, auth_cookies).post("/api/v1/workspaces/", json={"name": "Minimal Workspace"},)

    assert response.status_code == 201
    payload = response.json()
    assert payload["name"] == "Minimal Workspace"
    assert payload["owner_id"] == test_user.id
    assert payload["generator"] == "terraform"
    assert payload["provider"] == "azure"


@pytest.mark.asyncio
async def test_create_workspace_with_all_fields_returns_201(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    response = await with_cookies(client, auth_cookies).post("/api/v1/workspaces/", json={
        "name": "Full Workspace",
        "generator": "bicep",
        "provider": "azure",
        "github_repo": "acme/platform-infra",
    },)

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
    auth_cookies: dict[str, str],
) -> None:
    created = await with_cookies(client, auth_cookies).post("/api/v1/workspaces/", json={"name": "Owned Workspace"},)
    workspace_id = created.json()["id"]

    response = await with_cookies(client, auth_cookies).get(f"/api/v1/workspaces/{workspace_id}")

    assert response.status_code == 200
    assert response.json()["id"] == workspace_id


@pytest.mark.asyncio
async def test_get_workspace_non_existent_returns_404(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    response = await with_cookies(client, auth_cookies).get("/api/v1/workspaces/does-not-exist")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_get_workspace_of_other_user_returns_403(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    db,
) -> None:
    created = await with_cookies(client, auth_cookies).post("/api/v1/workspaces/", json={"name": "Private Workspace"},)
    workspace_id = created.json()["id"]
    other_cookies = await _create_other_user_cookies(db)

    response = await with_cookies(client, other_cookies).get(f"/api/v1/workspaces/{workspace_id}")

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
    auth_cookies: dict[str, str],
) -> None:
    created = await with_cookies(client, auth_cookies).post("/api/v1/workspaces/", json={"name": "Before"},)
    workspace_id = created.json()["id"]

    response = await with_cookies(client, auth_cookies).put(f"/api/v1/workspaces/{workspace_id}", json={"name": "After"},)

    assert response.status_code == 200
    assert response.json()["name"] == "After"


@pytest.mark.asyncio
async def test_update_workspace_multiple_fields_returns_200(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    created = await with_cookies(client, auth_cookies).post("/api/v1/workspaces/", json={"name": "Original"},)
    workspace_id = created.json()["id"]

    response = await with_cookies(client, auth_cookies).put(f"/api/v1/workspaces/{workspace_id}", json={
        "name": "Updated",
        "generator": "pulumi",
        "provider": "aws",
        "github_repo": "acme/updated",
        "github_branch": "develop",
    },)

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
    auth_cookies: dict[str, str],
) -> None:
    response = await with_cookies(client, auth_cookies).put("/api/v1/workspaces/missing-id", json={"name": "Nope"},)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_update_workspace_not_owner_returns_403(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    db,
) -> None:
    created = await with_cookies(client, auth_cookies).post("/api/v1/workspaces/", json={"name": "Owner Workspace"},)
    workspace_id = created.json()["id"]
    other_cookies = await _create_other_user_cookies(db)

    response = await with_cookies(client, other_cookies).put(f"/api/v1/workspaces/{workspace_id}", json={"name": "Should Fail"},)

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_delete_workspace_owned_returns_204(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    created = await with_cookies(client, auth_cookies).post("/api/v1/workspaces/", json={"name": "Delete Me"},)
    workspace_id = created.json()["id"]

    response = await with_cookies(client, auth_cookies).delete(f"/api/v1/workspaces/{workspace_id}")

    assert response.status_code == 204

    get_response = await with_cookies(client, auth_cookies).get(f"/api/v1/workspaces/{workspace_id}")
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_delete_workspace_non_existent_returns_404(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    response = await with_cookies(client, auth_cookies).delete("/api/v1/workspaces/missing-id")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_delete_workspace_not_owner_returns_403(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    db,
) -> None:
    created = await with_cookies(client, auth_cookies).post("/api/v1/workspaces/", json={"name": "Not Yours"},)
    workspace_id = created.json()["id"]
    other_cookies = await _create_other_user_cookies(db)

    response = await with_cookies(client, other_cookies).delete(f"/api/v1/workspaces/{workspace_id}")

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_update_workspace_omitting_github_repo_preserves_value(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    """When github_repo is omitted from the request body, the existing value is preserved."""
    created = await with_cookies(client, auth_cookies).post("/api/v1/workspaces/", json={"name": "GH Test"},)
    workspace_id = created.json()["id"]

    # Set github_repo first
    await with_cookies(client, auth_cookies).put(f"/api/v1/workspaces/{workspace_id}", json={"github_repo": "owner/repo"},)

    # Update only the name — github_repo should be preserved
    response = await with_cookies(client, auth_cookies).put(f"/api/v1/workspaces/{workspace_id}", json={"name": "Renamed"},)

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Renamed"
    assert data["github_repo"] == "owner/repo"


@pytest.mark.asyncio
async def test_update_workspace_null_github_repo_clears_value(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    """Explicitly sending github_repo=null clears the linked repository."""
    created = await with_cookies(client, auth_cookies).post("/api/v1/workspaces/", json={"name": "GH Test"},)
    workspace_id = created.json()["id"]

    # Set github_repo first
    await with_cookies(client, auth_cookies).put(f"/api/v1/workspaces/{workspace_id}", json={"github_repo": "owner/repo"},)

    # Explicitly null it
    response = await with_cookies(client, auth_cookies).put(f"/api/v1/workspaces/{workspace_id}", json={"github_repo": None},)

    assert response.status_code == 200
    assert response.json()["github_repo"] is None


@pytest.mark.asyncio
async def test_update_workspace_null_github_branch_resets_to_main(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    """Explicitly sending github_branch=null resets the branch to 'main'."""
    created = await with_cookies(client, auth_cookies).post("/api/v1/workspaces/", json={"name": "GH Test"},)
    workspace_id = created.json()["id"]

    # Set a custom branch
    await with_cookies(client, auth_cookies).put(f"/api/v1/workspaces/{workspace_id}", json={"github_branch": "develop"},)

    # Null it — should reset to main
    response = await with_cookies(client, auth_cookies).put(f"/api/v1/workspaces/{workspace_id}", json={"github_branch": None},)

    assert response.status_code == 200
    assert response.json()["github_branch"] == "main"
