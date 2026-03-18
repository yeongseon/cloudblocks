from __future__ import annotations

import base64
import json
import time
from typing import Any

import pytest
from httpx import AsyncClient

from app.core.errors import GitHubError
from app.core.security import generate_id, generate_session_token
from app.domain.models.entities import Session, User
from app.infrastructure.db.repositories import SQLiteSessionRepository, SQLiteUserRepository


VALID_ARCHITECTURE: dict[str, Any] = {
    "id": "arch-1",
    "name": "Test Architecture",
    "version": "0.1.0",
    "plates": [],
    "blocks": [],
    "connections": [],
    "externalActors": [],
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-01T00:00:00Z",
}


async def _create_workspace(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    **kwargs: Any,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "name": "GitHub Workspace",
        "github_repo": "acme/cloudblocks-arch",
        "github_branch": "main",
    }
    payload.update(kwargs)
    response = await client.post("/api/v1/workspaces/", cookies=auth_cookies, json=payload)
    assert response.status_code == 201
    return response.json()


async def _create_other_user_cookies(db) -> dict[str, str]:
    repo = SQLiteUserRepository(db)
    other_user = User(
        id=generate_id(),
        github_id="998877",
        github_username="octo-other",
        email="other@github.test",
        display_name="Other GitHub User",
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
async def test_list_github_repos_returns_formatted_list(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    mock_github,
    test_identity,
) -> None:
    mock_github.list_repos.return_value = [
        {
            "full_name": "acme/repo-one",
            "name": "repo-one",
            "private": True,
            "default_branch": "main",
            "html_url": "https://github.com/acme/repo-one",
        }
    ]

    response = await client.get(
        "/api/v1/github/repos",
        cookies=auth_cookies,
    )

    assert response.status_code == 200
    payload = response.json()["repos"]
    assert len(payload) == 1
    assert payload[0]["full_name"] == "acme/repo-one"
    assert payload[0]["default_branch"] == "main"
    mock_github.list_repos.assert_awaited_once_with("fake-github-token")


@pytest.mark.asyncio
async def test_list_github_repos_without_token_returns_502(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    response = await client.get("/api/v1/github/repos", cookies=auth_cookies)

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "GITHUB_ERROR"


@pytest.mark.asyncio
async def test_create_github_repo_returns_created_repo(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    mock_github,
    test_identity,
) -> None:
    mock_github.create_repo.return_value = {
        "full_name": "acme/new-repo",
        "name": "new-repo",
        "html_url": "https://github.com/acme/new-repo",
        "default_branch": "main",
    }

    response = await client.post(
        "/api/v1/github/repos",
        cookies=auth_cookies,
        json={"name": "new-repo", "description": "desc", "private": True},
    )

    assert response.status_code == 201
    assert response.json()["full_name"] == "acme/new-repo"
    mock_github.create_repo.assert_awaited_once_with(
        "fake-github-token",
        "new-repo",
        "desc",
        True,
    )


@pytest.mark.asyncio
async def test_sync_workspace_to_github_with_existing_file_uses_sha(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    mock_github,
    test_identity,
) -> None:
    workspace = await _create_workspace(client, auth_cookies)
    workspace_id = workspace["id"]
    architecture = {**VALID_ARCHITECTURE, "plates": [{"id": "plate-1"}]}

    mock_github.get_repo_contents.return_value = {"sha": "existing-sha"}
    mock_github.create_or_update_file.return_value = {"commit": {"sha": "commit-sha-1"}}

    response = await client.post(
        f"/api/v1/workspaces/{workspace_id}/sync",
        cookies=auth_cookies,
        json={"architecture": architecture, "commit_message": "sync update"},
    )

    assert response.status_code == 200
    assert response.json()["commit_sha"] == "commit-sha-1"

    mock_github.get_repo_contents.assert_awaited_once_with(
        "fake-github-token",
        "acme",
        "cloudblocks-arch",
        "cloudblocks/architecture.json",
        "main",
    )
    args = mock_github.create_or_update_file.await_args.args
    assert args[0] == "fake-github-token"
    assert args[1] == "acme"
    assert args[2] == "cloudblocks-arch"
    assert args[3] == "cloudblocks/architecture.json"
    decoded = json.loads(base64.b64decode(args[4]).decode())
    assert decoded == architecture
    assert args[5] == "sync update"
    assert args[6] == "main"
    assert args[7] == "existing-sha"


@pytest.mark.asyncio
async def test_sync_workspace_to_github_with_new_file_uses_none_sha(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    mock_github,
    test_identity,
) -> None:
    workspace = await _create_workspace(client, auth_cookies)
    workspace_id = workspace["id"]

    mock_github.get_repo_contents.side_effect = GitHubError("missing", details={"status_code": 404})
    mock_github.create_or_update_file.return_value = {"commit": {"sha": "commit-sha-2"}}

    response = await client.post(
        f"/api/v1/workspaces/{workspace_id}/sync",
        cookies=auth_cookies,
        json={"architecture": VALID_ARCHITECTURE},
    )

    assert response.status_code == 200
    args = mock_github.create_or_update_file.await_args.args
    assert args[7] is None


@pytest.mark.asyncio
async def test_sync_workspace_non_404_github_error_propagates_as_502(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    mock_github,
    test_identity,
) -> None:
    workspace = await _create_workspace(client, auth_cookies)
    workspace_id = workspace["id"]

    mock_github.get_repo_contents.side_effect = GitHubError(
        "rate limit exceeded", details={"status_code": 403}
    )

    response = await client.post(
        f"/api/v1/workspaces/{workspace_id}/sync",
        cookies=auth_cookies,
        json={"architecture": {"plates": [], "blocks": []}},
    )

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "GITHUB_ERROR"
    assert "rate limit" in response.json()["error"]["message"]

@pytest.mark.asyncio
async def test_sync_workspace_without_linked_repo_returns_502(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    workspace = await _create_workspace(client, auth_cookies, github_repo=None)
    response = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/sync",
        cookies=auth_cookies,
        json={"architecture": VALID_ARCHITECTURE},
    )

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "GITHUB_ERROR"


@pytest.mark.asyncio
async def test_sync_workspace_not_found_returns_404(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    response = await client.post(
        "/api/v1/workspaces/missing/sync",
        cookies=auth_cookies,
        json={"architecture": VALID_ARCHITECTURE},
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_sync_workspace_not_owner_returns_403(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    db,
) -> None:
    workspace = await _create_workspace(client, auth_cookies)
    other_cookies = await _create_other_user_cookies(db)

    response = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/sync",
        cookies=other_cookies,
        json={"architecture": VALID_ARCHITECTURE},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_pull_workspace_architecture_from_github(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    mock_github,
    test_identity,
) -> None:
    workspace = await _create_workspace(client, auth_cookies)
    architecture = {"plates": [{"id": "p-1"}], "blocks": [{"id": "b-1"}]}
    encoded = base64.b64encode(json.dumps(architecture).encode()).decode()
    mock_github.get_repo_contents.return_value = {"content": encoded}

    response = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/pull",
        cookies=auth_cookies,
    )

    assert response.status_code == 200
    assert response.json() == {"architecture": architecture}


@pytest.mark.asyncio
async def test_pull_workspace_architecture_file_not_found_returns_404(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    mock_github,
    test_identity,
) -> None:
    workspace = await _create_workspace(client, auth_cookies)
    mock_github.get_repo_contents.side_effect = GitHubError("no file", details={"status_code": 404})

    response = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/pull",
        cookies=auth_cookies,
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_pull_workspace_non_404_github_error_propagates_as_502(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    mock_github,
    test_identity,
) -> None:
    workspace = await _create_workspace(client, auth_cookies)
    mock_github.get_repo_contents.side_effect = GitHubError(
        "internal server error", details={"status_code": 500}
    )

    response = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/pull",
        cookies=auth_cookies,
    )

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "GITHUB_ERROR"
    assert "internal server error" in response.json()["error"]["message"]

@pytest.mark.asyncio
async def test_pull_workspace_architecture_unexpected_format_returns_502(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    mock_github,
    test_identity,
) -> None:
    workspace = await _create_workspace(client, auth_cookies)
    mock_github.get_repo_contents.return_value = ["unexpected"]

    response = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/pull",
        cookies=auth_cookies,
    )

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "GITHUB_ERROR"


@pytest.mark.asyncio
async def test_create_pull_request_for_workspace_returns_pr_details(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    mock_github,
    test_identity,
) -> None:
    workspace = await _create_workspace(client, auth_cookies)

    mock_github.get_default_branch_sha.return_value = "base-sha"
    mock_github.create_branch.return_value = {"ref": "refs/heads/cloudblocks/pr-branch"}
    mock_github.get_repo_contents.return_value = {"sha": "existing-on-branch"}
    mock_github.create_or_update_file.return_value = {"commit": {"sha": "commit-for-pr"}}
    mock_github.create_pull_request.return_value = {
        "html_url": "https://github.com/acme/cloudblocks-arch/pull/7",
        "number": 7,
    }

    response = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/pr",
        cookies=auth_cookies,
        json={
            "architecture": VALID_ARCHITECTURE,
            "title": "Update architecture",
            "body": "Automated update",
            "branch": "cloudblocks/pr-branch",
            "commit_message": "commit from tests",
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["pull_request_url"] == "https://github.com/acme/cloudblocks-arch/pull/7"
    assert payload["number"] == 7
    assert payload["branch"] == "cloudblocks/pr-branch"


@pytest.mark.asyncio
async def test_sync_with_missing_architecture_fields_returns_400(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    mock_github,
    test_identity,
) -> None:
    workspace = await _create_workspace(client, auth_cookies)

    response = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/sync",
        cookies=auth_cookies,
        json={"architecture": {"plates": []}},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_sync_with_invalid_plates_type_returns_400(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    mock_github,
    test_identity,
) -> None:
    workspace = await _create_workspace(client, auth_cookies)

    response = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/sync",
        cookies=auth_cookies,
        json={"architecture": {**VALID_ARCHITECTURE, "plates": "not-a-list"}},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_pr_with_missing_architecture_fields_returns_400(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    mock_github,
    test_identity,
) -> None:
    workspace = await _create_workspace(client, auth_cookies)

    response = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/pr",
        cookies=auth_cookies,
        json={
            "architecture": {"plates": []},
            "title": "Update architecture",
            "body": "Automated update",
        },
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_sync_with_valid_full_architecture_succeeds(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    mock_github,
    test_identity,
) -> None:
    workspace = await _create_workspace(client, auth_cookies)
    mock_github.get_repo_contents.return_value = {"sha": "existing-sha"}
    mock_github.create_or_update_file.return_value = {"commit": {"sha": "commit-sha-valid"}}

    response = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/sync",
        cookies=auth_cookies,
        json={"architecture": VALID_ARCHITECTURE},
    )

    assert response.status_code == 200
    assert response.json()["commit_sha"] == "commit-sha-valid"


@pytest.mark.asyncio
async def test_list_workspace_commits_returns_formatted_commits(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    mock_github,
    test_identity,
) -> None:
    workspace = await _create_workspace(client, auth_cookies)
    mock_github.list_commits.return_value = [
        {
            "sha": "abc123",
            "commit": {
                "message": "Update architecture",
                "author": {"name": "CloudBlocks Bot", "date": "2026-03-14T10:00:00Z"},
            },
        }
    ]

    response = await client.get(
        f"/api/v1/workspaces/{workspace['id']}/commits",
        cookies=auth_cookies,
    )

    assert response.status_code == 200
    payload = response.json()["commits"]
    assert len(payload) == 1
    assert payload[0]["sha"] == "abc123"
    assert payload[0]["author"] == "CloudBlocks Bot"
