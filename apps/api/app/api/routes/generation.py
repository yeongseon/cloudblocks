"""CloudBlocks API - Code generation routes.

Triggers server-side code generation: reads architecture from GitHub,
runs the generator, commits output back, optionally creates a PR.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.application.use_cases.generation_use_cases import (
    GetGenerationStatusUseCase,
    PreviewGenerationUseCase,
    TriggerGenerationUseCase,
)
from app.core.dependencies import (
    get_current_user,
    get_generation_status_use_case,
    get_preview_generation_use_case,
    get_trigger_generation_use_case,
)
from app.domain.models.entities import GenerationRun, User

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
    use_case: Annotated[TriggerGenerationUseCase, Depends(get_trigger_generation_use_case)],
) -> GenerationRunResponse:
    """Trigger code generation for a workspace.

    In a production system, this would enqueue a background job.
    For v0.5 MVP, it creates the run record in "pending" status.
    The actual generation + GitHub commit would be handled by a worker.
    """
    run = await use_case.execute(workspace_id, current_user, body.generator)
    return _run_to_response(run)


@router.get("/workspaces/{workspace_id}/generate/{run_id}")
async def get_generation_status(
    workspace_id: str,
    run_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[GetGenerationStatusUseCase, Depends(get_generation_status_use_case)],
) -> GenerationRunResponse:
    """Get the status of a generation run."""
    run = await use_case.execute(workspace_id, run_id, current_user)
    return _run_to_response(run)


@router.get("/workspaces/{workspace_id}/preview")
async def preview_generation(
    workspace_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[PreviewGenerationUseCase, Depends(get_preview_generation_use_case)],
) -> dict[str, object]:
    """Preview generated code without committing.

    For v0.5, this returns a placeholder. The actual generation
    engine integration will be added as the code generation
    pipeline is ported from the frontend.
    """
    return await use_case.execute(workspace_id, current_user)
