"""CloudBlocks API - Code generation routes.

Triggers server-side code generation: reads architecture from GitHub,
runs the generator, commits output back, optionally creates a PR.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.dependencies import (
    get_current_user,
    get_generation_run_repo,
    get_workspace_repo,
)
from app.core.errors import ForbiddenError, NotFoundError
from app.core.security import generate_id
from app.domain.models.entities import GenerationRun, GenerationStatus, User
from app.domain.models.repositories import GenerationRunRepository, WorkspaceRepository

router = APIRouter(tags=["generation"])


class GenerateRequest(BaseModel):
    generator: str = "terraform"
    provider: str = "azure"
    commit_message: str = "Generate infrastructure code"
    create_pr: bool = False
    branch: str | None = None


class GenerationRunResponse(BaseModel):
    id: str
    workspace_id: str
    status: str
    generator: str
    commit_sha: str | None
    pull_request_url: str | None
    error_message: str | None
    started_at: str | None
    completed_at: str | None
    created_at: str


def _run_to_response(run: GenerationRun) -> GenerationRunResponse:
    return GenerationRunResponse(
        id=run.id,
        workspace_id=run.workspace_id,
        status=run.status.value,
        generator=run.generator,
        commit_sha=run.commit_sha,
        pull_request_url=run.pull_request_url,
        error_message=run.error_message,
        started_at=run.started_at.isoformat() if run.started_at else None,
        completed_at=run.completed_at.isoformat() if run.completed_at else None,
        created_at=run.created_at.isoformat(),
    )


@router.post("/workspaces/{workspace_id}/generate", status_code=202)
async def trigger_generation(
    workspace_id: str,
    body: GenerateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
    run_repo: Annotated[GenerationRunRepository, Depends(get_generation_run_repo)],
) -> GenerationRunResponse:
    """Trigger code generation for a workspace.

    In a production system, this would enqueue a background job.
    For v0.5 MVP, it creates the run record in "pending" status.
    The actual generation + GitHub commit would be handled by a worker.
    """
    workspace = await workspace_repo.find_by_id(workspace_id)
    if not workspace:
        raise NotFoundError("Workspace", workspace_id)
    if workspace.owner_id != current_user.id:
        raise ForbiddenError("You do not own this workspace")

    run = GenerationRun(
        id=generate_id(),
        workspace_id=workspace_id,
        status=GenerationStatus.PENDING,
        generator=body.generator,
        started_at=datetime.now(timezone.utc),
    )
    run = await run_repo.create(run)
    return _run_to_response(run)


@router.get("/workspaces/{workspace_id}/generate/{run_id}")
async def get_generation_status(
    workspace_id: str,
    run_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
    run_repo: Annotated[GenerationRunRepository, Depends(get_generation_run_repo)],
) -> GenerationRunResponse:
    """Get the status of a generation run."""
    workspace = await workspace_repo.find_by_id(workspace_id)
    if not workspace:
        raise NotFoundError("Workspace", workspace_id)
    if workspace.owner_id != current_user.id:
        raise ForbiddenError("You do not own this workspace")

    run = await run_repo.find_by_id(run_id)
    if not run or run.workspace_id != workspace_id:
        raise NotFoundError("GenerationRun", run_id)
    return _run_to_response(run)


@router.get("/workspaces/{workspace_id}/preview")
async def preview_generation(
    workspace_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
) -> dict:
    """Preview generated code without committing.

    For v0.5, this returns a placeholder. The actual generation
    engine integration will be added as the code generation
    pipeline is ported from the frontend.
    """
    workspace = await workspace_repo.find_by_id(workspace_id)
    if not workspace:
        raise NotFoundError("Workspace", workspace_id)
    if workspace.owner_id != current_user.id:
        raise ForbiddenError("You do not own this workspace")

    return {
        "workspace_id": workspace_id,
        "generator": workspace.generator,
        "provider": workspace.provider,
        "files": [],
        "message": "Code preview will be available when the generation engine is integrated",
    }
