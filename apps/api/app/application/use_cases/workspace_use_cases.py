"""CloudBlocks API - Workspace use cases."""

from __future__ import annotations

from typing import final

from app.core.errors import ForbiddenError, NotFoundError
from app.core.security import generate_id
from app.domain.models.entities import User, Workspace
from app.domain.models.repositories import WorkspaceRepository


@final
class CreateWorkspaceUseCase:
    """Create a new workspace for a user."""

    def __init__(self, workspace_repo: WorkspaceRepository) -> None:
        self._repo: WorkspaceRepository = workspace_repo

    async def execute(
        self,
        user: User,
        name: str,
        generator: str = "terraform",
        provider: str = "azure",
        github_repo: str | None = None,
    ) -> Workspace:
        workspace = Workspace(
            id=generate_id(),
            owner_id=user.id,
            name=name,
            generator=generator,
            provider=provider,
            github_repo=github_repo,
        )
        return await self._repo.create(workspace)


@final
class GetWorkspaceUseCase:
    """Get a workspace, enforcing ownership."""

    def __init__(self, workspace_repo: WorkspaceRepository) -> None:
        self._repo: WorkspaceRepository = workspace_repo

    async def execute(self, workspace_id: str, user: User) -> Workspace:
        workspace = await self._repo.find_by_id(workspace_id)
        if not workspace:
            raise NotFoundError("Workspace", workspace_id)
        if workspace.owner_id != user.id:
            raise ForbiddenError("You do not own this workspace")
        return workspace


@final
class ListWorkspacesUseCase:
    """List all workspaces for a user."""

    def __init__(self, workspace_repo: WorkspaceRepository) -> None:
        self._repo: WorkspaceRepository = workspace_repo

    async def execute(self, user: User) -> list[Workspace]:
        return await self._repo.find_by_owner(user.id)


@final
class DeleteWorkspaceUseCase:
    """Delete a workspace, enforcing ownership."""

    def __init__(self, workspace_repo: WorkspaceRepository) -> None:
        self._repo: WorkspaceRepository = workspace_repo

    async def execute(self, workspace_id: str, user: User) -> bool:
        workspace = await self._repo.find_by_id(workspace_id)
        if not workspace:
            raise NotFoundError("Workspace", workspace_id)
        if workspace.owner_id != user.id:
            raise ForbiddenError("You do not own this workspace")
        return await self._repo.delete(workspace_id)


@final
class UpdateWorkspaceUseCase:
    def __init__(self, workspace_repo: WorkspaceRepository) -> None:
        self._repo: WorkspaceRepository = workspace_repo

    async def execute(
        self,
        workspace_id: str,
        user: User,
        *,
        name: str | None = None,
        generator: str | None = None,
        provider: str | None = None,
        github_repo: str | None = None,
        github_repo_provided: bool = False,
        github_branch: str | None = None,
        github_branch_provided: bool = False,
    ) -> Workspace:
        workspace = await self._repo.find_by_id(workspace_id)
        if not workspace:
            raise NotFoundError("Workspace", workspace_id)
        if workspace.owner_id != user.id:
            raise ForbiddenError("You do not own this workspace")

        if name is not None:
            workspace.name = name
        if generator is not None:
            workspace.generator = generator
        if provider is not None:
            workspace.provider = provider
        if github_repo_provided:
            workspace.github_repo = github_repo
        if github_branch_provided:
            workspace.github_branch = github_branch if github_branch is not None else "main"

        return await self._repo.update(workspace)
