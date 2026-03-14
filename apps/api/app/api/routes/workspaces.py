"""CloudBlocks API - Workspace routes.

Workspace metadata CRUD. Architecture data lives in GitHub repos.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.dependencies import get_current_user, get_workspace_repo
from app.core.errors import ForbiddenError, NotFoundError
from app.core.security import generate_id
from app.domain.models.entities import User, Workspace
from app.domain.models.repositories import WorkspaceRepository

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
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
) -> dict:
    """List all workspaces for the current user."""
    workspaces = await workspace_repo.find_by_owner(current_user.id)
    return {"workspaces": [_workspace_to_response(ws) for ws in workspaces]}


@router.post("/", status_code=201)
async def create_workspace(
    body: CreateWorkspaceRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
) -> WorkspaceResponse:
    """Create a new workspace."""
    workspace = Workspace(
        id=generate_id(),
        owner_id=current_user.id,
        name=body.name,
        generator=body.generator,
        provider=body.provider,
        github_repo=body.github_repo,
    )
    workspace = await workspace_repo.create(workspace)
    return _workspace_to_response(workspace)


@router.get("/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
) -> WorkspaceResponse:
    """Get workspace by ID."""
    workspace = await workspace_repo.find_by_id(workspace_id)
    if not workspace:
        raise NotFoundError("Workspace", workspace_id)
    if workspace.owner_id != current_user.id:
        raise ForbiddenError("You do not own this workspace")
    return _workspace_to_response(workspace)


@router.put("/{workspace_id}")
async def update_workspace(
    workspace_id: str,
    body: UpdateWorkspaceRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
) -> WorkspaceResponse:
    """Update workspace settings."""
    workspace = await workspace_repo.find_by_id(workspace_id)
    if not workspace:
        raise NotFoundError("Workspace", workspace_id)
    if workspace.owner_id != current_user.id:
        raise ForbiddenError("You do not own this workspace")

    if body.name is not None:
        workspace.name = body.name
    if body.generator is not None:
        workspace.generator = body.generator
    if body.provider is not None:
        workspace.provider = body.provider
    if body.github_repo is not None:
        workspace.github_repo = body.github_repo
    if body.github_branch is not None:
        workspace.github_branch = body.github_branch

    workspace = await workspace_repo.update(workspace)
    return _workspace_to_response(workspace)


@router.delete("/{workspace_id}", status_code=204)
async def delete_workspace(
    workspace_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
) -> None:
    """Delete a workspace."""
    workspace = await workspace_repo.find_by_id(workspace_id)
    if not workspace:
        raise NotFoundError("Workspace", workspace_id)
    if workspace.owner_id != current_user.id:
        raise ForbiddenError("You do not own this workspace")
    await workspace_repo.delete(workspace_id)
