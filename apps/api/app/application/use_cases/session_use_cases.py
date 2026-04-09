from __future__ import annotations

from typing import final

from app.core.errors import ForbiddenError, NotFoundError
from app.domain.models.entities import Session
from app.domain.models.repositories import SessionRepository, WorkspaceRepository


@final
class BindWorkspaceToSessionUseCase:
    def __init__(
        self,
        session_repo: SessionRepository,
        workspace_repo: WorkspaceRepository,
    ) -> None:
        self._session_repo: SessionRepository = session_repo
        self._workspace_repo: WorkspaceRepository = workspace_repo

    async def execute(
        self,
        session: Session,
        workspace_id: str,
        repo_full_name: str | None,
    ) -> dict[str, str | None]:
        workspace = await self._workspace_repo.find_by_id(workspace_id)
        if not workspace:
            raise NotFoundError("Workspace", workspace_id)
        if workspace.owner_id != session.user_id:
            raise ForbiddenError("Workspace does not belong to current user")

        await self._session_repo.update_workspace(session.id, workspace_id, repo_full_name)
        return {
            "current_workspace_id": workspace_id,
            "current_repo_full_name": repo_full_name,
        }
