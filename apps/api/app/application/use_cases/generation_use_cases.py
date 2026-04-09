from __future__ import annotations

from datetime import datetime, timezone
from typing import final

from app.core.errors import ForbiddenError, NotFoundError
from app.core.security import generate_id
from app.domain.models.entities import GenerationRun, GenerationStatus, User, Workspace
from app.domain.models.repositories import GenerationRunRepository, WorkspaceRepository


class _WorkspaceGenerationUseCase:
    def __init__(self, workspace_repo: WorkspaceRepository) -> None:
        self._workspace_repo: WorkspaceRepository = workspace_repo

    async def _get_workspace(self, workspace_id: str, user: User) -> Workspace:
        workspace = await self._workspace_repo.find_by_id(workspace_id)
        if not workspace:
            raise NotFoundError("Workspace", workspace_id)
        if workspace.owner_id != user.id:
            raise ForbiddenError("You do not own this workspace")
        return workspace


@final
class TriggerGenerationUseCase(_WorkspaceGenerationUseCase):
    def __init__(
        self, workspace_repo: WorkspaceRepository, run_repo: GenerationRunRepository
    ) -> None:
        super().__init__(workspace_repo)
        self._run_repo: GenerationRunRepository = run_repo

    async def execute(self, workspace_id: str, user: User, generator: str) -> GenerationRun:
        _ = await self._get_workspace(workspace_id, user)
        run = GenerationRun(
            id=generate_id(),
            workspace_id=workspace_id,
            status=GenerationStatus.PENDING,
            generator=generator,
            started_at=datetime.now(timezone.utc),
        )
        return await self._run_repo.create(run)


@final
class GetGenerationStatusUseCase(_WorkspaceGenerationUseCase):
    def __init__(
        self, workspace_repo: WorkspaceRepository, run_repo: GenerationRunRepository
    ) -> None:
        super().__init__(workspace_repo)
        self._run_repo: GenerationRunRepository = run_repo

    async def execute(self, workspace_id: str, run_id: str, user: User) -> GenerationRun:
        _ = await self._get_workspace(workspace_id, user)
        run = await self._run_repo.find_by_id(run_id)
        if not run or run.workspace_id != workspace_id:
            raise NotFoundError("GenerationRun", run_id)
        return run


@final
class PreviewGenerationUseCase(_WorkspaceGenerationUseCase):
    async def execute(self, workspace_id: str, user: User) -> dict[str, object]:
        workspace = await self._get_workspace(workspace_id, user)
        return {
            "workspace_id": workspace_id,
            "generator": workspace.generator,
            "provider": workspace.provider,
            "files": [],
            "message": "Code preview will be available when the generation engine is integrated",
        }
