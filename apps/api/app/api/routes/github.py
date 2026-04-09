"""CloudBlocks API - GitHub integration routes.

Manage GitHub repository connections, sync architecture, and create PRs.
"""

from __future__ import annotations

from typing import Annotated, cast

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ValidationInfo, field_validator, model_validator

from app.application.use_cases.github_use_cases import (
    CreateGitHubRepoUseCase,
    CreateWorkspacePullRequestUseCase,
    ListGitHubReposUseCase,
    ListWorkspaceCommitsUseCase,
    PullWorkspaceArchitectureUseCase,
    SyncWorkspaceToGitHubUseCase,
)
from app.core.dependencies import (
    get_create_github_repo_use_case,
    get_create_workspace_pull_request_use_case,
    get_current_user,
    get_list_github_repos_use_case,
    get_list_workspace_commits_use_case,
    get_pull_workspace_architecture_use_case,
    get_sync_workspace_to_github_use_case,
)
from app.core.errors import ValidationError
from app.domain.models.entities import User

router = APIRouter(tags=["github"])


class CreateRepoRequest(BaseModel):
    name: str
    description: str = ""
    private: bool = True


class SyncRequest(BaseModel):
    architecture: dict[str, object]
    commit_message: str = "Update architecture"

    @field_validator("architecture")
    @classmethod
    def validate_architecture(cls, v: object) -> dict[str, object]:
        return _validate_architecture(v)


class PullRequestRequest(BaseModel):
    architecture: dict[str, object]
    title: str = "Update cloud architecture"
    body: str = ""
    branch: str | None = None
    commit_message: str = "Update architecture via CloudBlocks"

    @field_validator("architecture")
    @classmethod
    def validate_architecture(cls, v: object) -> dict[str, object]:
        return _validate_architecture(v)


# ─── Architecture payload validation ─────────────────────────


class ArchitecturePayload(BaseModel):
    """Validates the top-level structure of a CloudBlocks architecture document.

    Ensures architecture collections use supported wire formats and have
    correct top-level types. Accepts canonical nodes format and legacy
    plates/blocks format for backward compatibility.
    """

    id: str
    name: str
    version: str
    nodes: list[dict[str, object]] = []
    endpoints: list[dict[str, object]] = []
    plates: list[dict[str, object]] = []
    blocks: list[dict[str, object]] = []
    connections: list[dict[str, object]] = []
    externalActors: list[dict[str, object]] = []  # noqa: N815
    createdAt: str  # noqa: N815
    updatedAt: str  # noqa: N815

    @field_validator(
        "nodes",
        "endpoints",
        "plates",
        "blocks",
        "connections",
        "externalActors",
        mode="before",
    )
    @classmethod
    def must_be_list(cls, v: object, info: ValidationInfo) -> object:
        if not isinstance(v, list):
            raise ValueError(f"{info.field_name} must be a list")
        return cast(list[object], v)

    @model_validator(mode="after")
    def require_supported_structure(self) -> ArchitecturePayload:
        has_nodes = len(self.nodes) > 0
        has_legacy_keys = "plates" in self.model_fields_set and "blocks" in self.model_fields_set
        if not has_nodes and not has_legacy_keys:
            raise ValueError(
                "architecture must include non-empty 'nodes' or both legacy 'plates' and 'blocks'"
            )
        return self


def _validate_architecture(data: object) -> dict[str, object]:
    """Validate architecture payload, raising ValidationError on failure."""
    try:
        _ = ArchitecturePayload.model_validate(data)
    except Exception as exc:
        raise ValidationError(
            f"Invalid architecture payload: {exc}",
            details={"validation_errors": str(exc)},
        ) from exc
    if not isinstance(data, dict):
        raise ValidationError("Invalid architecture payload: expected JSON object")
    return cast(dict[str, object], data)


@router.get("/github/repos")
async def list_repos(
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[ListGitHubReposUseCase, Depends(get_list_github_repos_use_case)],
) -> dict[str, object]:
    """List GitHub repositories the user has access to."""
    return {"repos": await use_case.execute(current_user)}


@router.post("/github/repos", status_code=201)
async def create_repo(
    body: CreateRepoRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[CreateGitHubRepoUseCase, Depends(get_create_github_repo_use_case)],
) -> dict[str, object]:
    """Create a new GitHub repository."""
    return await use_case.execute(current_user, body.name, body.description, body.private)


@router.post("/workspaces/{workspace_id}/sync")
async def sync_to_github(
    workspace_id: str,
    body: SyncRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[
        SyncWorkspaceToGitHubUseCase, Depends(get_sync_workspace_to_github_use_case)
    ],
) -> dict[str, object]:
    """Sync architecture.json to the linked GitHub repository."""
    return await use_case.execute(
        workspace_id,
        current_user,
        body.architecture,
        body.commit_message,
    )


@router.post("/workspaces/{workspace_id}/pull")
async def pull_from_github(
    workspace_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[
        PullWorkspaceArchitectureUseCase, Depends(get_pull_workspace_architecture_use_case)
    ],
) -> dict[str, object]:
    """Pull the latest architecture.json from the linked GitHub repository."""
    return await use_case.execute(workspace_id, current_user)


@router.post("/workspaces/{workspace_id}/pr", status_code=201)
async def create_pull_request(
    workspace_id: str,
    body: PullRequestRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[
        CreateWorkspacePullRequestUseCase, Depends(get_create_workspace_pull_request_use_case)
    ],
) -> dict[str, object]:
    """Create a PR with architecture changes on a new branch."""
    return await use_case.execute(
        workspace_id,
        current_user,
        body.architecture,
        body.title,
        body.body,
        body.branch,
        body.commit_message,
    )


@router.get("/workspaces/{workspace_id}/commits")
async def list_commits(
    workspace_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[ListWorkspaceCommitsUseCase, Depends(get_list_workspace_commits_use_case)],
) -> dict[str, object]:
    """List recent commits for the linked repository."""
    return {"commits": await use_case.execute(workspace_id, current_user)}
