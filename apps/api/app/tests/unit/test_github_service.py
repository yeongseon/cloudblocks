from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
from urllib.parse import parse_qs, urlparse

import pytest

from app.core.errors import GitHubError
from app.infrastructure.github_service import (
    GITHUB_API_URL,
    GITHUB_TOKEN_URL,
    GitHubService,
)


def _mock_async_client_with_response(response: MagicMock) -> AsyncMock:
    client = AsyncMock()
    client.get.return_value = response
    client.post.return_value = response
    client.put.return_value = response
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=False)
    return client


def test_init_stores_client_credentials() -> None:
    service = GitHubService(client_id="cid", client_secret="csecret")

    assert service.client_id == "cid"
    assert service.client_secret == "csecret"


def test_get_authorize_url_builds_expected_query_params() -> None:
    service = GitHubService(client_id="cid", client_secret="csecret")

    url = service.get_authorize_url("https://app/callback", "state-1")
    parsed = urlparse(url)
    query = parse_qs(parsed.query)

    assert parsed.scheme == "https"
    assert parsed.netloc == "github.com"
    assert parsed.path == "/login/oauth/authorize"
    assert query["client_id"] == ["cid"]
    assert query["redirect_uri"] == ["https://app/callback"]
    assert query["scope"] == ["repo,read:user,user:email"]
    assert query["state"] == ["state-1"]


async def test_exchange_code_success() -> None:
    service = GitHubService(client_id="cid", client_secret="csecret")
    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {"access_token": "ghp_xxx", "token_type": "bearer"}
    client = _mock_async_client_with_response(response)

    with patch("httpx.AsyncClient", return_value=client):
        result = await service.exchange_code("test-code")

    assert result["access_token"] == "ghp_xxx"
    client.post.assert_awaited_once_with(
        GITHUB_TOKEN_URL,
        json={"client_id": "cid", "client_secret": "csecret", "code": "test-code"},
        headers={"Accept": "application/json"},
    )


async def test_exchange_code_raises_on_http_error() -> None:
    service = GitHubService(client_id="cid", client_secret="csecret")
    response = MagicMock()
    response.status_code = 500
    response.json.return_value = {}
    client = _mock_async_client_with_response(response)

    with (
        patch("httpx.AsyncClient", return_value=client),
        pytest.raises(GitHubError, match="Token exchange failed: 500"),
    ):
        await service.exchange_code("bad-code")


async def test_exchange_code_raises_on_oauth_error_body() -> None:
    service = GitHubService(client_id="cid", client_secret="csecret")
    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {
        "error": "bad_verification_code",
        "error_description": "The code passed is incorrect",
    }
    client = _mock_async_client_with_response(response)

    with (
        patch("httpx.AsyncClient", return_value=client),
        pytest.raises(GitHubError, match="OAuth error: The code passed is incorrect"),
    ):
        await service.exchange_code("bad-code")


async def test_get_user_success() -> None:
    service = GitHubService("cid", "secret")
    response = MagicMock(status_code=200)
    response.json.return_value = {"id": 10, "login": "octocat"}
    client = _mock_async_client_with_response(response)

    with patch("httpx.AsyncClient", return_value=client):
        result = await service.get_user("token")

    assert result == {"id": 10, "login": "octocat"}
    client.get.assert_awaited_once_with(
        f"{GITHUB_API_URL}/user", headers=service._auth_headers("token")
    )


async def test_get_user_emails_success() -> None:
    service = GitHubService("cid", "secret")
    response = MagicMock(status_code=200)
    response.json.return_value = [{"email": "a@example.com", "primary": True}]
    client = _mock_async_client_with_response(response)

    with patch("httpx.AsyncClient", return_value=client):
        result = await service.get_user_emails("token")

    assert result == [{"email": "a@example.com", "primary": True}]


async def test_list_repos_success() -> None:
    service = GitHubService("cid", "secret")
    response = MagicMock(status_code=200)
    response.json.return_value = [{"name": "repo1"}]
    client = _mock_async_client_with_response(response)

    with patch("httpx.AsyncClient", return_value=client):
        result = await service.list_repos("token")

    assert result == [{"name": "repo1"}]
    client.get.assert_awaited_once_with(
        f"{GITHUB_API_URL}/user/repos",
        params={"sort": "updated", "per_page": 50},
        headers=service._auth_headers("token"),
    )


async def test_create_repo_success() -> None:
    service = GitHubService("cid", "secret")
    response = MagicMock(status_code=201)
    response.json.return_value = {"full_name": "owner/repo1", "private": True}
    client = _mock_async_client_with_response(response)

    with patch("httpx.AsyncClient", return_value=client):
        result = await service.create_repo("token", "repo1", description="desc", private=True)

    assert result["full_name"] == "owner/repo1"


async def test_get_repo_contents_success() -> None:
    service = GitHubService("cid", "secret")
    response = MagicMock(status_code=200)
    response.json.return_value = [{"name": "README.md", "type": "file"}]
    client = _mock_async_client_with_response(response)

    with patch("httpx.AsyncClient", return_value=client):
        result = await service.get_repo_contents("token", "owner", "repo", path="", ref="main")

    assert result == [{"name": "README.md", "type": "file"}]


async def test_create_or_update_file_success_without_sha() -> None:
    service = GitHubService("cid", "secret")
    response = MagicMock(status_code=201)
    response.json.return_value = {"content": {"path": "a.txt"}}
    client = _mock_async_client_with_response(response)

    with patch("httpx.AsyncClient", return_value=client):
        result = await service.create_or_update_file(
            "token", "owner", "repo", "a.txt", "YQ==", "add a", branch="main"
        )

    assert result == {"content": {"path": "a.txt"}}
    called_json = client.put.await_args.kwargs["json"]
    assert called_json == {"message": "add a", "content": "YQ==", "branch": "main"}


async def test_create_or_update_file_success_with_sha() -> None:
    service = GitHubService("cid", "secret")
    response = MagicMock(status_code=200)
    response.json.return_value = {"content": {"path": "a.txt"}}
    client = _mock_async_client_with_response(response)

    with patch("httpx.AsyncClient", return_value=client):
        await service.create_or_update_file(
            "token", "owner", "repo", "a.txt", "YQ==", "update a", branch="main", sha="abc123"
        )

    called_json = client.put.await_args.kwargs["json"]
    assert called_json["sha"] == "abc123"


async def test_create_branch_success() -> None:
    service = GitHubService("cid", "secret")
    response = MagicMock(status_code=201)
    response.json.return_value = {"ref": "refs/heads/feature"}
    client = _mock_async_client_with_response(response)

    with patch("httpx.AsyncClient", return_value=client):
        result = await service.create_branch("token", "owner", "repo", "feature", "abc123")

    assert result == {"ref": "refs/heads/feature"}


async def test_get_default_branch_sha_success() -> None:
    service = GitHubService("cid", "secret")
    response = MagicMock(status_code=200)
    response.json.return_value = {"object": {"sha": "deadbeef"}}
    client = _mock_async_client_with_response(response)

    with patch("httpx.AsyncClient", return_value=client):
        sha = await service.get_default_branch_sha("token", "owner", "repo")

    assert sha == "deadbeef"


async def test_create_pull_request_success() -> None:
    service = GitHubService("cid", "secret")
    response = MagicMock(status_code=201)
    response.json.return_value = {"html_url": "https://github.com/org/repo/pull/1"}
    client = _mock_async_client_with_response(response)

    with patch("httpx.AsyncClient", return_value=client):
        result = await service.create_pull_request(
            "token", "owner", "repo", "PR title", "feature", base="main", body="body"
        )

    assert result["html_url"] == "https://github.com/org/repo/pull/1"


async def test_list_commits_success() -> None:
    service = GitHubService("cid", "secret")
    response = MagicMock(status_code=200)
    response.json.return_value = [{"sha": "abc"}, {"sha": "def"}]
    client = _mock_async_client_with_response(response)

    with patch("httpx.AsyncClient", return_value=client):
        commits = await service.list_commits("token", "owner", "repo", branch="main", per_page=2)

    assert commits == [{"sha": "abc"}, {"sha": "def"}]


def test_auth_headers_returns_expected_dict() -> None:
    service = GitHubService("cid", "secret")

    headers = service._auth_headers("abc")

    assert headers == {
        "Authorization": "Bearer abc",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def test_check_response_ok_status_does_not_raise() -> None:
    service = GitHubService("cid", "secret")
    response = MagicMock()
    response.status_code = 200

    service._check_response(response)


def test_check_response_raises_with_json_message() -> None:
    service = GitHubService("cid", "secret")
    response = MagicMock()
    response.status_code = 404
    response.json.return_value = {"message": "Not Found"}
    response.text = "fallback"

    with pytest.raises(GitHubError, match=r"GitHub API error \(404\): Not Found") as exc:
        service._check_response(response)

    assert exc.value.details == {"status_code": 404}


def test_check_response_raises_with_non_json_error_text() -> None:
    service = GitHubService("cid", "secret")
    response = MagicMock()
    response.status_code = 500
    response.json.side_effect = ValueError("not json")
    response.text = "plain error"

    with pytest.raises(GitHubError, match=r"GitHub API error \(500\): plain error") as exc:
        service._check_response(response)

    assert exc.value.details == {"status_code": 500}
