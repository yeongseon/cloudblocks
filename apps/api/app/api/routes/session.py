"""CloudBlocks API - Session routes for workspace binding."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.core.dependencies import get_current_session, get_session_repo
from app.domain.models.entities import Session
from app.domain.models.repositories import SessionRepository


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
    session_repo: Annotated[SessionRepository, Depends(get_session_repo)],
) -> SessionInfoResponse:
    """Bind a workspace to the current session."""
    await session_repo.update_workspace(
        session.id, body.workspace_id, body.repo_full_name
    )
    return SessionInfoResponse(
        current_workspace_id=body.workspace_id,
        current_repo_full_name=body.repo_full_name,
    )
