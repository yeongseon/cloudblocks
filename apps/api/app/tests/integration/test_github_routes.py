from __future__ import annotations

import base64
import json
from typing import Any

import pytest
from httpx import AsyncClient

from app.core.errors import GitHubError
from app.core.security import create_access_token, generate_id
from app.domain.models.entities import User
from app.infrastructure.db.repositories import SQLiteUserRepository


async def _create_workspace(
    client: AsyncClient,
    auth_headers: dict[str, str],
    **kwargs: Any,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "name": "GitHub Workspace",
        "github_repo": "acme/cloudblocks-arch",
        "github_branch": "main",
    }
    payload.update(kwargs)
    response = await client.post("/api/v1/workspaces/", headers=auth_headers, json=payload)
    assert response.status_code == 201
    return response.json()


async def _create_other_user_auth(db) -> dict[str, str]:
    repo = SQLiteUserRepository(db)
    other_user = User(
        id=generate_id(),
        github_id="998877",
        github_username="octo-other",
        email="other@github.test",
        display_name="Other GitHub User",
    )
    created = await repo.create(other_user)
    return {"Authorization": f"Bearer {create_access_token(created.id)}"}


@pytest.mark.asyncio
async def test_list_github_repos_returns_formatted_list(
    client: AsyncClient,
    auth_headers: dict[str, str],
    mock_github,
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
        headers=auth_headers,
        params={"x_github_token": "fake-token"},
    )

    assert response.status_code == 200
    payload = response.json()["repos"]
    assert len(payload) == 1
    assert payload[0]["full_name"] == "acme/repo-one"
    assert payload[0]["default_branch"] == "main"
    mock_github.list_repos.assert_awaited_once_with("fake-token")


@pytest.mark.asyncio
async def test_list_github_repos_without_token_returns_502(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    response = await client.get("/api/v1/github/repos", headers=auth_headers)

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "GITHUB_ERROR"


@pytest.mark.asyncio
async def test_create_github_repo_returns_created_repo(
    client: AsyncClient,
    auth_headers: dict[str, str],
    mock_github,
) -> None:
    mock_github.create_repo.return_value = {
        "full_name": "acme/new-repo",
        "name": "new-repo",
        "html_url": "https://github.com/acme/new-repo",
        "default_branch": "main",
    }

    response = await client.post(
        "/api/v1/github/repos",
        headers=auth_headers,
        params={"x_github_token": "fake-token"},
        json={"name": "new-repo", "description": "desc", "private": True},
    )

    assert response.status_code == 201
    assert response.json()["full_name"] == "acme/new-repo"
    mock_github.create_repo.assert_awaited_once_with("fake-token", "new-repo", "desc", True)


@pytest.mark.asyncio
async def test_sync_workspace_to_github_with_existing_file_uses_sha(
    client: AsyncClient,
    auth_headers: dict[str, str],
    mock_github,
) -> None:
    workspace = await _create_workspace(client, auth_headers)
    workspace_id = workspace["id"]
    architecture = {"plates": [{"id": "plate-1"}], "blocks": []}

    mock_github.get_repo_contents.return_value = {"sha": "existing-sha"}
    mock_github.create_or_update_file.return_value = {"commit": {"sha": "commit-sha-1"}}

    response = await client.post(
        f"/api/v1/workspaces/{workspace_id}/sync",
        headers=auth_headers,
        params={"x_github_token": "fake-token"},
        json={"architecture": architecture, "commit_message": "sync update"},
    )

    assert response.status_code == 200
    assert response.json()["commit_sha"] == "commit-sha-1"

    mock_github.get_repo_contents.assert_awaited_once_with(
        "fake-token",
        "acme",
        "cloudblocks-arch",
        "cloudblocks/architecture.json",
        "main",
    )
    args = mock_github.create_or_update_file.await_args.args
    assert args[0] == "fake-token"
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
    auth_headers: dict[str, str],
    mock_github,
) -> None:
    workspace = await _create_workspace(client, auth_headers)
    workspace_id = workspace["id"]

    mock_github.get_repo_contents.side_effect = GitHubError("missing")
    mock_github.create_or_update_file.return_value = {"commit": {"sha": "commit-sha-2"}}

    response = await client.post(
        f"/api/v1/workspaces/{workspace_id}/sync",
        headers=auth_headers,
        params={"x_github_token": "fake-token"},
        json={"architecture": {"plates": [], "blocks": []}},
    )

    assert response.status_code == 200
    args = mock_github.create_or_update_file.await_args.args
    assert args[7] is None


@pytest.mark.asyncio
async def test_sync_workspace_without_linked_repo_returns_502(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    workspace = await _create_workspace(client, auth_headers, github_repo=None)
    response = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/sync",
        headers=auth_headers,
        params={"x_github_token": "fake-token"},
        json={"architecture": {"plates": []}},
    )

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "GITHUB_ERROR"


@pytest.mark.asyncio
async def test_sync_workspace_not_found_returns_404(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    response = await client.post(
        "/api/v1/workspaces/missing/sync",
        headers=auth_headers,
        params={"x_github_token": "fake-token"},
        json={"architecture": {"plates": []}},
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_sync_workspace_not_owner_returns_403(
    client: AsyncClient,
    auth_headers: dict[str, str],
    db,
) -> None:
    workspace = await _create_workspace(client, auth_headers)
    other_headers = await _create_other_user_auth(db)

    response = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/sync",
        headers=other_headers,
        params={"x_github_token": "fake-token"},
        json={"architecture": {"plates": []}},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_pull_workspace_architecture_from_github(
    client: AsyncClient,
    auth_headers: dict[str, str],
    mock_github,
) -> None:
    workspace = await _create_workspace(client, auth_headers)
    architecture = {"plates": [{"id": "p-1"}], "blocks": [{"id": "b-1"}]}
    encoded = base64.b64encode(json.dumps(architecture).encode()).decode()
    mock_github.get_repo_contents.return_value = {"content": encoded}

    response = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/pull",
        headers=auth_headers,
        params={"x_github_token": "fake-token"},
    )

    assert response.status_code == 200
    assert response.json() == {"architecture": architecture}


@pytest.mark.asyncio
async def test_pull_workspace_architecture_file_not_found_returns_404(
    client: AsyncClient,
    auth_headers: dict[str, str],
    mock_github,
) -> None:
    workspace = await _create_workspace(client, auth_headers)
    mock_github.get_repo_contents.side_effect = GitHubError("no file")

    response = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/pull",
        headers=auth_headers,
        params={"x_github_token": "fake-token"},
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_pull_workspace_architecture_unexpected_format_returns_502(
    client: AsyncClient,
    auth_headers: dict[str, str],
    mock_github,
) -> None:
    workspace = await _create_workspace(client, auth_headers)
    mock_github.get_repo_contents.return_value = ["unexpected"]

    response = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/pull",
        headers=auth_headers,
        params={"x_github_token": "fake-token"},
    )

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "GITHUB_ERROR"


@pytest.mark.asyncio
async def test_create_pull_request_for_workspace_returns_pr_details(
    client: AsyncClient,
    auth_headers: dict[str, str],
    mock_github,
) -> None:
    workspace = await _create_workspace(client, auth_headers)

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
        headers=auth_headers,
        params={"x_github_token": "fake-token"},
        json={
            "architecture": {"plates": [], "blocks": []},
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
async def test_list_workspace_commits_returns_formatted_commits(
    client: AsyncClient,
    auth_headers: dict[str, str],
    mock_github,
) -> None:
    workspace = await _create_workspace(client, auth_headers)
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
        headers=auth_headers,
        params={"x_github_token": "fake-token"},
    )

    assert response.status_code == 200
    payload = response.json()["commits"]
    assert len(payload) == 1
    assert payload[0]["sha"] == "abc123"
    assert payload[0]["author"] == "CloudBlocks Bot"
