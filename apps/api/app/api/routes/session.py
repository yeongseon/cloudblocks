"""CloudBlocks API - Session routes for workspace binding."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.application.use_cases.session_use_cases import BindWorkspaceToSessionUseCase
from app.core.dependencies import (
    get_bind_workspace_to_session_use_case,
    get_current_session,
)
from app.domain.models.entities import Session

router = APIRouter(prefix="/session", tags=["session"])


class WorkspaceBindRequest(BaseModel):
    workspace_id: str
    repo_full_name: str | None = None


class SessionInfoResponse(BaseModel):
    current_workspace_id: str | None
    current_repo_full_name: str | None


@router.post("/workspace")
async def bind_workspace(
    body: WorkspaceBindRequest,
    request: Request,
    session: Annotated[Session, Depends(get_current_session)],
    use_case: Annotated[
        BindWorkspaceToSessionUseCase, Depends(get_bind_workspace_to_session_use_case)
    ],
) -> SessionInfoResponse:
    """Bind a workspace to the current session.

    Validates that the workspace exists and belongs to the session user.
    """
    _ = request
    session_info = await use_case.execute(session, body.workspace_id, body.repo_full_name)
    return SessionInfoResponse(**session_info)
