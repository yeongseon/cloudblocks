"""CloudBlocks API - Dependency injection container.

Provides FastAPI dependencies for database, repositories, services, and auth.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header

from app.core.config import settings
from app.core.errors import UnauthorizedError
from app.core.security import decode_token
from app.domain.models.entities import User
from app.domain.models.repositories import (
    GenerationRunRepository,
    IdentityRepository,
    UserRepository,
    WorkspaceRepository,
)
from app.infrastructure.db.connection import Database
from app.infrastructure.db.repositories import (
    SQLiteGenerationRunRepository,
    SQLiteIdentityRepository,
    SQLiteUserRepository,
    SQLiteWorkspaceRepository,
)
from app.infrastructure.github_service import GitHubService

# Singletons
_db = Database()
_github_service = GitHubService(
    client_id=settings.github_client_id,
    client_secret=settings.github_client_secret,
)


def get_database() -> Database:
    return _db


def get_github_service() -> GitHubService:
    return _github_service


def get_user_repo(db: Annotated[Database, Depends(get_database)]) -> UserRepository:
    return SQLiteUserRepository(db)


def get_identity_repo(db: Annotated[Database, Depends(get_database)]) -> IdentityRepository:
    return SQLiteIdentityRepository(db)


def get_workspace_repo(db: Annotated[Database, Depends(get_database)]) -> WorkspaceRepository:
    return SQLiteWorkspaceRepository(db)


def get_generation_run_repo(
    db: Annotated[Database, Depends(get_database)],
) -> GenerationRunRepository:
    return SQLiteGenerationRunRepository(db)


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    user_repo: Annotated[UserRepository, Depends(get_user_repo)] = None,  # noqa: B008
) -> User:
    """Extract and validate the current user from the Authorization header."""
    if not authorization:
        raise UnauthorizedError("Missing Authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise UnauthorizedError("Invalid Authorization header format")

    payload = decode_token(token, expected_type="access")
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Invalid token payload")

    user = await user_repo.find_by_id(user_id)
    if not user:
        raise UnauthorizedError("User not found")

    return user
