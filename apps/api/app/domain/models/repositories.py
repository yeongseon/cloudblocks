"""CloudBlocks API - Repository interfaces (ports)."""

from abc import ABC, abstractmethod
from typing import Generic, TypeVar

T = TypeVar("T")


class Repository(ABC, Generic[T]):
    """Base repository interface for the domain layer."""

    @abstractmethod
    async def find_by_id(self, entity_id: str) -> T | None:
        """Find entity by ID."""
        ...

    @abstractmethod
    async def find_all(self, **filters: object) -> list[T]:
        """Find all entities matching filters."""
        ...

    @abstractmethod
    async def create(self, entity: T) -> T:
        """Create a new entity."""
        ...

    @abstractmethod
    async def update(self, entity_id: str, **data: object) -> T | None:
        """Update an existing entity."""
        ...

    @abstractmethod
    async def delete(self, entity_id: str) -> bool:
        """Delete an entity by ID."""
        ...
