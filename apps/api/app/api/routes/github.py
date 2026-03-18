"""CloudBlocks API - GitHub integration routes.

Manage GitHub repository connections, sync architecture, and create PRs.
"""

from __future__ import annotations

import base64
import json
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, field_validator

from app.core.dependencies import (
    get_current_user,
    get_github_service,
    get_identity_repo,
    get_workspace_repo,
)
from app.core.errors import ForbiddenError, GitHubError, NotFoundError, ValidationError
from app.core.security import decrypt_token
from app.domain.models.entities import User
from app.domain.models.repositories import IdentityRepository, WorkspaceRepository
from app.infrastructure.github_service import GitHubService

router = APIRouter(tags=["github"])


class CreateRepoRequest(BaseModel):
    name: str
    description: str = ""
    private: bool = True


class SyncRequest(BaseModel):
    architecture: dict[str, Any]
    commit_message: str = "Update architecture"

    @field_validator("architecture")
    @classmethod
    def validate_architecture(cls, v: Any) -> dict[str, Any]:
        return _validate_architecture(v)


class PullRequestRequest(BaseModel):
    architecture: dict[str, Any]
    title: str = "Update cloud architecture"
    body: str = ""
    branch: str | None = None
    commit_message: str = "Update architecture via CloudBlocks"

    @field_validator("architecture")
    @classmethod
    def validate_architecture(cls, v: Any) -> dict[str, Any]:
        return _validate_architecture(v)


# ─── Architecture payload validation ─────────────────────────


class ArchitecturePayload(BaseModel):
    """Validates the top-level structure of a CloudBlocks architecture document.

    Ensures required collections (plates, blocks, connections) are present
    and have the correct types. Does not deep-validate individual items
    because the canonical schema may evolve; we guard against clearly
    malformed documents (missing keys, wrong types) that would break
    downstream consumers (diff engine, code generation, pull flows).
    """

    id: str
    name: str
    version: str
    plates: list[dict[str, Any]]
    blocks: list[dict[str, Any]]
    connections: list[dict[str, Any]] = []
    externalActors: list[dict[str, Any]] = []  # noqa: N815
    createdAt: str  # noqa: N815
    updatedAt: str  # noqa: N815

    @field_validator("plates", "blocks", "connections", "externalActors", mode="before")
    @classmethod
    def must_be_list(cls, v: Any, info: Any) -> Any:
        if not isinstance(v, list):
            raise ValueError(f"{info.field_name} must be a list")
        return v


def _validate_architecture(data: dict[str, Any]) -> dict[str, Any]:
    """Validate architecture payload, raising ValidationError on failure."""
    try:
        ArchitecturePayload.model_validate(data)
    except Exception as exc:
        raise ValidationError(
            f"Invalid architecture payload: {exc}",
            details={"validation_errors": str(exc)},
        ) from exc
    return data

async def _get_github_token(
    user: User,
    identity_repo: IdentityRepository,
) -> str:
    identities = await identity_repo.find_by_user_id(user.id)
    github_identity = next((i for i in identities if i.provider == "github"), None)
    if not github_identity:
        raise GitHubError("No GitHub identity linked. Please sign in with GitHub first.")
    if not github_identity.encrypted_access_token:
        raise GitHubError("GitHub token not available. Please re-authenticate with GitHub.")
    return decrypt_token(github_identity.encrypted_access_token)


@router.get("/github/repos")
async def list_repos(
    current_user: Annotated[User, Depends(get_current_user)],
    github: Annotated[GitHubService, Depends(get_github_service)],
    identity_repo: Annotated[IdentityRepository, Depends(get_identity_repo)],
) -> dict[str, Any]:
    """List GitHub repositories the user has access to."""
    token = await _get_github_token(current_user, identity_repo)
    repos = await github.list_repos(token)
    return {
        "repos": [
            {
                "full_name": r["full_name"],
                "name": r["name"],
                "private": r["private"],
                "default_branch": r.get("default_branch", "main"),
                "html_url": r["html_url"],
            }
            for r in repos
        ]
    }


@router.post("/github/repos", status_code=201)
async def create_repo(
    body: CreateRepoRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    github: Annotated[GitHubService, Depends(get_github_service)],
    identity_repo: Annotated[IdentityRepository, Depends(get_identity_repo)],
) -> dict[str, Any]:
    """Create a new GitHub repository."""
    token = await _get_github_token(current_user, identity_repo)
    repo = await github.create_repo(token, body.name, body.description, body.private)
    return {
        "full_name": repo["full_name"],
        "name": repo["name"],
        "html_url": repo["html_url"],
        "default_branch": repo.get("default_branch", "main"),
    }


@router.post("/workspaces/{workspace_id}/sync")
async def sync_to_github(
    workspace_id: str,
    body: SyncRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
    github: Annotated[GitHubService, Depends(get_github_service)],
    identity_repo: Annotated[IdentityRepository, Depends(get_identity_repo)],
) -> dict[str, Any]:
    """Sync architecture.json to the linked GitHub repository."""
    workspace = await workspace_repo.find_by_id(workspace_id)
    if not workspace:
        raise NotFoundError("Workspace", workspace_id)
    if workspace.owner_id != current_user.id:
        raise ForbiddenError("You do not own this workspace")
    if not workspace.github_repo:
        raise GitHubError("Workspace is not linked to a GitHub repository")

    token = await _get_github_token(current_user, identity_repo)
    owner, repo = workspace.github_repo.split("/", 1)

    # Prepare architecture.json content
    arch_json = json.dumps(body.architecture, indent=2, sort_keys=True)
    content_b64 = base64.b64encode(arch_json.encode()).decode()

    # Check if file exists to get its SHA
    sha: str | None = None
    try:
        existing = await github.get_repo_contents(
            token, owner, repo, "cloudblocks/architecture.json", workspace.github_branch
        )
        if isinstance(existing, dict):
            sha = existing.get("sha")
    except GitHubError as exc:
        if exc.details.get("status_code") == 404:
            pass  # File doesn't exist yet
        else:
            raise

    # Commit the file
    result = await github.create_or_update_file(
        token,
        owner,
        repo,
        "cloudblocks/architecture.json",
        content_b64,
        body.commit_message,
        workspace.github_branch,
        sha,
    )

    # Update last synced timestamp
    workspace.last_synced_at = datetime.now(timezone.utc)
    await workspace_repo.update(workspace)

    return {
        "message": "Architecture synced to GitHub",
        "commit_sha": result.get("commit", {}).get("sha"),
    }


@router.post("/workspaces/{workspace_id}/pull")
async def pull_from_github(
    workspace_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
    github: Annotated[GitHubService, Depends(get_github_service)],
    identity_repo: Annotated[IdentityRepository, Depends(get_identity_repo)],
) -> dict[str, Any]:
    """Pull the latest architecture.json from the linked GitHub repository."""
    workspace = await workspace_repo.find_by_id(workspace_id)
    if not workspace:
        raise NotFoundError("Workspace", workspace_id)
    if workspace.owner_id != current_user.id:
        raise ForbiddenError("You do not own this workspace")
    if not workspace.github_repo:
        raise GitHubError("Workspace is not linked to a GitHub repository")

    token = await _get_github_token(current_user, identity_repo)
    owner, repo = workspace.github_repo.split("/", 1)

    try:
        content = await github.get_repo_contents(
            token, owner, repo, "cloudblocks/architecture.json", workspace.github_branch
        )
    except GitHubError as exc:
        if exc.details.get("status_code") == 404:
            raise NotFoundError("File", "cloudblocks/architecture.json") from None
        raise

    if isinstance(content, dict) and content.get("content"):
        decoded = base64.b64decode(content["content"]).decode()
        architecture = json.loads(decoded)
    else:
        raise GitHubError("Unexpected response format from GitHub")

    return {"architecture": architecture}


@router.post("/workspaces/{workspace_id}/pr", status_code=201)
async def create_pull_request(
    workspace_id: str,
    body: PullRequestRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
    github: Annotated[GitHubService, Depends(get_github_service)],
    identity_repo: Annotated[IdentityRepository, Depends(get_identity_repo)],
) -> dict[str, Any]:
    """Create a PR with architecture changes on a new branch."""
    workspace = await workspace_repo.find_by_id(workspace_id)
    if not workspace:
        raise NotFoundError("Workspace", workspace_id)
    if workspace.owner_id != current_user.id:
        raise ForbiddenError("You do not own this workspace")
    if not workspace.github_repo:
        raise GitHubError("Workspace is not linked to a GitHub repository")

    token = await _get_github_token(current_user, identity_repo)
    owner, repo = workspace.github_repo.split("/", 1)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    branch_name = body.branch or f"cloudblocks/update-{timestamp}"

    # Get default branch SHA
    base_sha = await github.get_default_branch_sha(token, owner, repo, workspace.github_branch)

    # Create new branch
    await github.create_branch(token, owner, repo, branch_name, base_sha)

    # Commit architecture.json to the new branch
    arch_json = json.dumps(body.architecture, indent=2, sort_keys=True)
    content_b64 = base64.b64encode(arch_json.encode()).decode()

    # Check if file exists on the new branch (inherited from base)
    sha: str | None = None
    try:
        existing = await github.get_repo_contents(
            token, owner, repo, "cloudblocks/architecture.json", branch_name
        )
        if isinstance(existing, dict):
            sha = existing.get("sha")
    except GitHubError as exc:
        if exc.details.get("status_code") == 404:
            pass
        else:
            raise

    await github.create_or_update_file(
        token,
        owner,
        repo,
        "cloudblocks/architecture.json",
        content_b64,
        body.commit_message,
        branch_name,
        sha,
    )

    # Create PR
    pr = await github.create_pull_request(
        token,
        owner,
        repo,
        body.title,
        branch_name,
        workspace.github_branch,
        body.body,
    )

    return {
        "pull_request_url": pr["html_url"],
        "number": pr["number"],
        "branch": branch_name,
    }


@router.get("/workspaces/{workspace_id}/commits")
async def list_commits(
    workspace_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
    github: Annotated[GitHubService, Depends(get_github_service)],
    identity_repo: Annotated[IdentityRepository, Depends(get_identity_repo)],
) -> dict[str, Any]:
    """List recent commits for the linked repository."""
    workspace = await workspace_repo.find_by_id(workspace_id)
    if not workspace:
        raise NotFoundError("Workspace", workspace_id)
    if workspace.owner_id != current_user.id:
        raise ForbiddenError("You do not own this workspace")
    if not workspace.github_repo:
        raise GitHubError("Workspace is not linked to a GitHub repository")

    token = await _get_github_token(current_user, identity_repo)
    owner, repo = workspace.github_repo.split("/", 1)
    commits = await github.list_commits(token, owner, repo, workspace.github_branch)

    return {
        "commits": [
            {
                "sha": c["sha"],
                "message": c["commit"]["message"],
                "author": c["commit"]["author"]["name"],
                "date": c["commit"]["author"]["date"],
            }
            for c in commits
        ]
    }
