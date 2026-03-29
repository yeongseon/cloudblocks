"""CloudBlocks API - GitHub integration service.

Handles GitHub App OAuth exchange and GitHub API operations
(repo listing, file commits, branch/PR creation).
"""

from __future__ import annotations

from typing import Any

import httpx

from app.core.errors import GitHubError

GITHUB_OAUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_API_URL = "https://api.github.com"


class GitHubService:
    """Client for GitHub API operations."""

    def __init__(self, client_id: str, client_secret: str) -> None:
        self.client_id = client_id
        self.client_secret = client_secret
        self._client = httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=10.0))

    async def close(self) -> None:
        await self._client.aclose()

    def get_authorize_url(self, redirect_uri: str, state: str) -> str:
        """Build the GitHub OAuth authorize URL."""
        return (
            f"{GITHUB_OAUTH_URL}"
            f"?client_id={self.client_id}"
            f"&redirect_uri={redirect_uri}"
            f"&scope=repo,read:user,user:email"
            f"&state={state}"
        )

    async def exchange_code(self, code: str) -> dict[str, str]:
        """Exchange an OAuth code for an access token."""
        resp = await self._client.post(
            GITHUB_TOKEN_URL,
            json={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        if resp.status_code != 200:
            raise GitHubError(f"Token exchange failed: {resp.status_code}")
        data = resp.json()
        if "error" in data:
            raise GitHubError(f"OAuth error: {data['error_description']}")
        return data

    async def get_user(self, access_token: str) -> dict[str, Any]:
        """Get the authenticated GitHub user profile."""
        resp = await self._client.get(
            f"{GITHUB_API_URL}/user",
            headers=self._auth_headers(access_token),
        )
        self._check_response(resp)
        return resp.json()

    async def get_user_emails(self, access_token: str) -> list[dict[str, Any]]:
        """Get the authenticated user's email addresses."""
        resp = await self._client.get(
            f"{GITHUB_API_URL}/user/emails",
            headers=self._auth_headers(access_token),
        )
        self._check_response(resp)
        return resp.json()

    async def list_repos(self, access_token: str) -> list[dict[str, Any]]:
        """List repositories the authenticated user has access to."""
        repos: list[dict[str, Any]] = []
        for page in range(1, 11):
            resp = await self._client.get(
                f"{GITHUB_API_URL}/user/repos",
                params={"sort": "updated", "per_page": 100, "page": page},
                headers=self._auth_headers(access_token),
            )
            self._check_response(resp)
            page_repos = resp.json()
            repos.extend(page_repos)
            if len(page_repos) < 100:
                break
        return repos

    async def create_repo(
        self, access_token: str, name: str, description: str = "", private: bool = True
    ) -> dict[str, Any]:
        """Create a new GitHub repository."""
        resp = await self._client.post(
            f"{GITHUB_API_URL}/user/repos",
            json={
                "name": name,
                "description": description,
                "private": private,
                "auto_init": True,
            },
            headers=self._auth_headers(access_token),
        )
        self._check_response(resp)
        return resp.json()

    async def get_repo_contents(
        self, access_token: str, owner: str, repo: str, path: str = "", ref: str = "main"
    ) -> list[dict[str, Any]] | dict[str, Any]:
        """Get contents of a file or directory in a repo."""
        resp = await self._client.get(
            f"{GITHUB_API_URL}/repos/{owner}/{repo}/contents/{path}",
            params={"ref": ref},
            headers=self._auth_headers(access_token),
        )
        self._check_response(resp)
        return resp.json()

    async def create_or_update_file(
        self,
        access_token: str,
        owner: str,
        repo: str,
        path: str,
        content_b64: str,
        message: str,
        branch: str = "main",
        sha: str | None = None,
    ) -> dict[str, Any]:
        """Create or update a file in a repository."""
        body: dict[str, Any] = {
            "message": message,
            "content": content_b64,
            "branch": branch,
        }
        if sha:
            body["sha"] = sha
        resp = await self._client.put(
            f"{GITHUB_API_URL}/repos/{owner}/{repo}/contents/{path}",
            json=body,
            headers=self._auth_headers(access_token),
        )
        self._check_response(resp)
        return resp.json()

    async def create_branch(
        self, access_token: str, owner: str, repo: str, branch: str, from_sha: str
    ) -> dict[str, Any]:
        """Create a new branch from a given SHA."""
        resp = await self._client.post(
            f"{GITHUB_API_URL}/repos/{owner}/{repo}/git/refs",
            json={"ref": f"refs/heads/{branch}", "sha": from_sha},
            headers=self._auth_headers(access_token),
        )
        self._check_response(resp)
        return resp.json()

    async def get_default_branch_sha(
        self, access_token: str, owner: str, repo: str, branch: str = "main"
    ) -> str:
        """Get the SHA of the latest commit on a branch."""
        resp = await self._client.get(
            f"{GITHUB_API_URL}/repos/{owner}/{repo}/git/ref/heads/{branch}",
            headers=self._auth_headers(access_token),
        )
        self._check_response(resp)
        return resp.json()["object"]["sha"]

    async def create_pull_request(
        self,
        access_token: str,
        owner: str,
        repo: str,
        title: str,
        head: str,
        base: str = "main",
        body: str = "",
    ) -> dict[str, Any]:
        """Create a pull request."""
        resp = await self._client.post(
            f"{GITHUB_API_URL}/repos/{owner}/{repo}/pulls",
            json={"title": title, "head": head, "base": base, "body": body},
            headers=self._auth_headers(access_token),
        )
        self._check_response(resp)
        return resp.json()

    async def list_commits(
        self, access_token: str, owner: str, repo: str, branch: str = "main", per_page: int = 20
    ) -> list[dict[str, Any]]:
        """List recent commits on a branch."""
        resp = await self._client.get(
            f"{GITHUB_API_URL}/repos/{owner}/{repo}/commits",
            params={"sha": branch, "per_page": per_page},
            headers=self._auth_headers(access_token),
        )
        self._check_response(resp)
        return resp.json()

    def _auth_headers(self, access_token: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    def _check_response(self, resp: httpx.Response) -> None:
        if resp.status_code >= 400:
            try:
                detail = resp.json().get("message", resp.text)
            except Exception:
                detail = resp.text
            raise GitHubError(
                f"GitHub API error ({resp.status_code}): {detail}",
                details={"status_code": resp.status_code},
            )
