"""CloudBlocks API - Workspace routes.

Workspace metadata CRUD. Architecture data lives in GitHub repos.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.application.use_cases.workspace_use_cases import (
    CreateWorkspaceUseCase,
    DeleteWorkspaceUseCase,
    GetWorkspaceUseCase,
    ListWorkspacesUseCase,
    UpdateWorkspaceUseCase,
)
from app.core.dependencies import (
    get_create_workspace_use_case,
    get_current_user,
    get_delete_workspace_use_case,
    get_list_workspaces_use_case,
    get_update_workspace_use_case,
    get_workspace_use_case,
)
from app.domain.models.entities import User, Workspace

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


class CreateWorkspaceRequest(BaseModel):
    name: str
    generator: str = "terraform"
    provider: str = "azure"
    github_repo: str | None = None


class UpdateWorkspaceRequest(BaseModel):
    name: str | None = None
    generator: str | None = None
    provider: str | None = None
    github_repo: str | None = None
    github_branch: str | None = None


class WorkspaceResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    generator: str
    provider: str
    github_repo: str | None
    github_branch: str
    last_synced_at: str | None
    created_at: str
    updated_at: str


def _workspace_to_response(ws: Workspace) -> WorkspaceResponse:
    return WorkspaceResponse(
        id=ws.id,
        owner_id=ws.owner_id,
        name=ws.name,
        generator=ws.generator,
        provider=ws.provider,
        github_repo=ws.github_repo,
        github_branch=ws.github_branch,
        last_synced_at=ws.last_synced_at.isoformat() if ws.last_synced_at else None,
        created_at=ws.created_at.isoformat(),
        updated_at=ws.updated_at.isoformat(),
    )


@router.get("/")
async def list_workspaces(
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[ListWorkspacesUseCase, Depends(get_list_workspaces_use_case)],
) -> dict[str, list[WorkspaceResponse]]:
    """List all workspaces for the current user."""
    workspaces = await use_case.execute(current_user)
    return {"workspaces": [_workspace_to_response(ws) for ws in workspaces]}


@router.post("/", status_code=201)
async def create_workspace(
    body: CreateWorkspaceRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[CreateWorkspaceUseCase, Depends(get_create_workspace_use_case)],
) -> WorkspaceResponse:
    """Create a new workspace."""
    workspace = await use_case.execute(
        current_user,
        body.name,
        body.generator,
        body.provider,
        body.github_repo,
    )
    return _workspace_to_response(workspace)


@router.get("/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[GetWorkspaceUseCase, Depends(get_workspace_use_case)],
) -> WorkspaceResponse:
    """Get workspace by ID."""
    workspace = await use_case.execute(workspace_id, current_user)
    return _workspace_to_response(workspace)


@router.put("/{workspace_id}")
async def update_workspace(
    workspace_id: str,
    body: UpdateWorkspaceRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[UpdateWorkspaceUseCase, Depends(get_update_workspace_use_case)],
) -> WorkspaceResponse:
    """Update workspace settings."""
    workspace = await use_case.execute(
        workspace_id,
        current_user,
        name=body.name,
        generator=body.generator,
        provider=body.provider,
        github_repo=body.github_repo,
        github_repo_provided="github_repo" in body.model_fields_set,
        github_branch=body.github_branch,
        github_branch_provided="github_branch" in body.model_fields_set,
    )
    return _workspace_to_response(workspace)


@router.delete("/{workspace_id}", status_code=204)
async def delete_workspace(
    workspace_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[DeleteWorkspaceUseCase, Depends(get_delete_workspace_use_case)],
) -> None:
    """Delete a workspace."""
    _ = await use_case.execute(workspace_id, current_user)
