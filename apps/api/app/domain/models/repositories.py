"""CloudBlocks API - Repository interfaces (ports) for Clean Architecture."""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.domain.models.entities import (
    GenerationRun,
    Identity,
    Session,
    User,
    Workspace,
)


class UserRepository(ABC):
    """Port for user persistence."""

    @abstractmethod
    async def find_by_id(self, user_id: str) -> User | None: ...

    @abstractmethod
    async def find_by_github_id(self, github_id: str) -> User | None: ...

    @abstractmethod
    async def create(self, user: User) -> User: ...

    @abstractmethod
    async def update(self, user: User) -> User: ...


class IdentityRepository(ABC):
    """Port for identity provider persistence."""

    @abstractmethod
    async def find_by_user_id(self, user_id: str) -> list[Identity]: ...

    @abstractmethod
    async def find_by_provider(self, provider: str, provider_id: str) -> Identity | None: ...

    @abstractmethod
    async def create(self, identity: Identity) -> Identity: ...

    @abstractmethod
    async def update(self, identity: Identity) -> Identity: ...

    @abstractmethod
    async def delete_by_user_id(self, user_id: str) -> int: ...


class WorkspaceRepository(ABC):
    """Port for workspace index persistence."""

    @abstractmethod
    async def find_by_id(self, workspace_id: str) -> Workspace | None: ...

    @abstractmethod
    async def find_by_owner(self, owner_id: str) -> list[Workspace]: ...

    @abstractmethod
    async def create(self, workspace: Workspace) -> Workspace: ...

    @abstractmethod
    async def update(self, workspace: Workspace) -> Workspace: ...

    @abstractmethod
    async def delete(self, workspace_id: str) -> bool: ...


class GenerationRunRepository(ABC):
    """Port for generation run tracking persistence."""

    @abstractmethod
    async def find_by_id(self, run_id: str) -> GenerationRun | None: ...

    @abstractmethod
    async def find_by_workspace(self, workspace_id: str) -> list[GenerationRun]: ...

    @abstractmethod
    async def create(self, run: GenerationRun) -> GenerationRun: ...

    @abstractmethod
    async def update(self, run: GenerationRun) -> GenerationRun: ...


class SessionRepository(ABC):
    """Port for session persistence."""

    @abstractmethod
    async def create(self, session: Session) -> Session: ...

    @abstractmethod
    async def get_by_id(self, session_id: str) -> Session | None: ...

    @abstractmethod
    async def revoke(self, session_id: str) -> None: ...

    @abstractmethod
    async def revoke_all_for_user(self, user_id: str) -> None: ...

    @abstractmethod
    async def update_last_seen(self, session_id: str, timestamp: int) -> None: ...

    @abstractmethod
    async def update_workspace(
        self,
        session_id: str,
        workspace_id: str,
        repo_full_name: str | None,
    ) -> None: ...

    @abstractmethod
    async def cleanup_expired(self) -> int: ...
