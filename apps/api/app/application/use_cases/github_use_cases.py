from __future__ import annotations

import base64
import json
from datetime import datetime, timezone
from typing import cast, final

from app.core.errors import ForbiddenError, GitHubError, NotFoundError
from app.core.security import decrypt_token
from app.domain.models.entities import User, Workspace
from app.domain.models.repositories import IdentityRepository, WorkspaceRepository
from app.infrastructure.github_service import GitHubService


def _github_error_status_code(error: GitHubError) -> object:
    details = cast(dict[object, object], error.details)
    return details.get("status_code")


class _GitHubWorkspaceUseCase:
    def __init__(
        self,
        workspace_repo: WorkspaceRepository,
        identity_repo: IdentityRepository,
        github_service: GitHubService,
    ) -> None:
        self._workspace_repo: WorkspaceRepository = workspace_repo
        self._identity_repo: IdentityRepository = identity_repo
        self._github_service: GitHubService = github_service

    async def _get_workspace(self, workspace_id: str, user: User) -> Workspace:
        workspace = await self._workspace_repo.find_by_id(workspace_id)
        if not workspace:
            raise NotFoundError("Workspace", workspace_id)
        if workspace.owner_id != user.id:
            raise ForbiddenError("You do not own this workspace")
        if not workspace.github_repo:
            raise GitHubError("Workspace is not linked to a GitHub repository")
        return workspace

    async def _get_github_token(self, user: User) -> str:
        identities = await self._identity_repo.find_by_user_id(user.id)
        github_identity = next((item for item in identities if item.provider == "github"), None)
        if not github_identity:
            raise GitHubError("No GitHub identity linked. Please sign in with GitHub first.")
        if not github_identity.encrypted_access_token:
            raise GitHubError("GitHub token not available. Please re-authenticate with GitHub.")
        return decrypt_token(github_identity.encrypted_access_token)

    @staticmethod
    def _split_repo(full_name: str) -> tuple[str, str]:
        owner, repo = full_name.split("/", 1)
        return owner, repo


@final
class ListGitHubReposUseCase:
    def __init__(self, identity_repo: IdentityRepository, github_service: GitHubService) -> None:
        self._identity_repo: IdentityRepository = identity_repo
        self._github_service: GitHubService = github_service

    async def execute(self, user: User) -> list[dict[str, object]]:
        identities = await self._identity_repo.find_by_user_id(user.id)
        github_identity = next((item for item in identities if item.provider == "github"), None)
        if not github_identity:
            raise GitHubError("No GitHub identity linked. Please sign in with GitHub first.")
        if not github_identity.encrypted_access_token:
            raise GitHubError("GitHub token not available. Please re-authenticate with GitHub.")

        token = decrypt_token(github_identity.encrypted_access_token)
        repos = await self._github_service.list_repos(token)
        return [
            {
                "full_name": repo["full_name"],
                "name": repo["name"],
                "private": repo["private"],
                "default_branch": repo.get("default_branch", "main"),
                "html_url": repo["html_url"],
            }
            for repo in repos
        ]


@final
class CreateGitHubRepoUseCase:
    def __init__(self, identity_repo: IdentityRepository, github_service: GitHubService) -> None:
        self._identity_repo: IdentityRepository = identity_repo
        self._github_service: GitHubService = github_service

    async def execute(
        self, user: User, name: str, description: str, private: bool
    ) -> dict[str, object]:
        identities = await self._identity_repo.find_by_user_id(user.id)
        github_identity = next((item for item in identities if item.provider == "github"), None)
        if not github_identity:
            raise GitHubError("No GitHub identity linked. Please sign in with GitHub first.")
        if not github_identity.encrypted_access_token:
            raise GitHubError("GitHub token not available. Please re-authenticate with GitHub.")

        token = decrypt_token(github_identity.encrypted_access_token)
        repo = await self._github_service.create_repo(token, name, description, private)
        return {
            "full_name": repo["full_name"],
            "name": repo["name"],
            "html_url": repo["html_url"],
            "default_branch": repo.get("default_branch", "main"),
        }


@final
class SyncWorkspaceToGitHubUseCase(_GitHubWorkspaceUseCase):
    async def execute(
        self,
        workspace_id: str,
        user: User,
        architecture: dict[str, object],
        commit_message: str,
    ) -> dict[str, object]:
        workspace = await self._get_workspace(workspace_id, user)
        token = await self._get_github_token(user)
        github_repo = workspace.github_repo
        if github_repo is None:
            raise GitHubError("Workspace is not linked to a GitHub repository")
        owner, repo = self._split_repo(github_repo)

        architecture_json = json.dumps(architecture, indent=2, sort_keys=True)
        content_b64 = base64.b64encode(architecture_json.encode()).decode()

        sha: str | None = None
        try:
            existing = await self._github_service.get_repo_contents(
                token,
                owner,
                repo,
                "cloudblocks/architecture.json",
                workspace.github_branch,
            )
            if isinstance(existing, dict):
                sha = existing.get("sha")
        except GitHubError as exc:
            if _github_error_status_code(exc) != 404:
                raise

        result = await self._github_service.create_or_update_file(
            token,
            owner,
            repo,
            "cloudblocks/architecture.json",
            content_b64,
            commit_message,
            workspace.github_branch,
            sha,
        )

        workspace.last_synced_at = datetime.now(timezone.utc)
        _ = await self._workspace_repo.update(workspace)

        return {
            "message": "Architecture synced to GitHub",
            "commit_sha": cast(dict[str, object], result.get("commit", {})).get("sha"),
        }


@final
class PullWorkspaceArchitectureUseCase(_GitHubWorkspaceUseCase):
    async def execute(self, workspace_id: str, user: User) -> dict[str, object]:
        workspace = await self._get_workspace(workspace_id, user)
        token = await self._get_github_token(user)
        github_repo = workspace.github_repo
        if github_repo is None:
            raise GitHubError("Workspace is not linked to a GitHub repository")
        owner, repo = self._split_repo(github_repo)

        try:
            content = await self._github_service.get_repo_contents(
                token,
                owner,
                repo,
                "cloudblocks/architecture.json",
                workspace.github_branch,
            )
        except GitHubError as exc:
            if _github_error_status_code(exc) == 404:
                raise NotFoundError("File", "cloudblocks/architecture.json") from None
            raise

        if isinstance(content, dict) and content.get("content"):
            encoded_content = cast(object, content.get("content"))
            if not isinstance(encoded_content, str):
                raise GitHubError("Unexpected response format from GitHub")
            decoded = base64.b64decode(encoded_content).decode()
            architecture = cast(dict[str, object], json.loads(decoded))
            return {"architecture": architecture}

        raise GitHubError("Unexpected response format from GitHub")


@final
class CreateWorkspacePullRequestUseCase(_GitHubWorkspaceUseCase):
    async def execute(
        self,
        workspace_id: str,
        user: User,
        architecture: dict[str, object],
        title: str,
        body: str,
        branch: str | None,
        commit_message: str,
    ) -> dict[str, object]:
        workspace = await self._get_workspace(workspace_id, user)
        token = await self._get_github_token(user)
        github_repo = workspace.github_repo
        if github_repo is None:
            raise GitHubError("Workspace is not linked to a GitHub repository")
        owner, repo = self._split_repo(github_repo)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        branch_name = branch or f"cloudblocks/update-{timestamp}"

        base_sha = await self._github_service.get_default_branch_sha(
            token,
            owner,
            repo,
            workspace.github_branch,
        )
        _ = await self._github_service.create_branch(token, owner, repo, branch_name, base_sha)

        architecture_json = json.dumps(architecture, indent=2, sort_keys=True)
        content_b64 = base64.b64encode(architecture_json.encode()).decode()

        sha: str | None = None
        try:
            existing = await self._github_service.get_repo_contents(
                token,
                owner,
                repo,
                "cloudblocks/architecture.json",
                branch_name,
            )
            if isinstance(existing, dict):
                sha = existing.get("sha")
        except GitHubError as exc:
            if _github_error_status_code(exc) != 404:
                raise

        _ = await self._github_service.create_or_update_file(
            token,
            owner,
            repo,
            "cloudblocks/architecture.json",
            content_b64,
            commit_message,
            branch_name,
            sha,
        )

        pull_request = await self._github_service.create_pull_request(
            token,
            owner,
            repo,
            title,
            branch_name,
            workspace.github_branch,
            body,
        )

        return {
            "pull_request_url": pull_request["html_url"],
            "number": pull_request["number"],
            "branch": branch_name,
        }


@final
class ListWorkspaceCommitsUseCase(_GitHubWorkspaceUseCase):
    async def execute(self, workspace_id: str, user: User) -> list[dict[str, object]]:
        workspace = await self._get_workspace(workspace_id, user)
        token = await self._get_github_token(user)
        github_repo = workspace.github_repo
        if github_repo is None:
            raise GitHubError("Workspace is not linked to a GitHub repository")
        owner, repo = self._split_repo(github_repo)
        commits = await self._github_service.list_commits(
            token, owner, repo, workspace.github_branch
        )
        return [
            {
                "sha": commit["sha"],
                "message": commit["commit"]["message"],
                "author": commit["commit"]["author"]["name"],
                "date": commit["commit"]["author"]["date"],
                "html_url": commit["html_url"],
            }
            for commit in commits
        ]
