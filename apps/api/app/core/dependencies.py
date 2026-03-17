"""CloudBlocks API - Dependency injection container.

Provides FastAPI dependencies for database, repositories, services, and auth.
"""

from __future__ import annotations

import time
from typing import Annotated

from fastapi import Depends, Request

from app.core.config import settings
from app.core.errors import UnauthorizedError
from app.domain.models.entities import Session, User
from app.domain.models.repositories import (
    GenerationRunRepository,
    IdentityRepository,
    SessionRepository,
    UserRepository,
    WorkspaceRepository,
)
from app.infrastructure.db.connection import Database
from app.infrastructure.db.repositories import (
    SQLiteGenerationRunRepository,
    SQLiteIdentityRepository,
    SQLiteSessionRepository,
    SQLiteUserRepository,
    SQLiteWorkspaceRepository,
)
from app.infrastructure.github_service import GitHubService

# Singletons
_db = Database.from_url(settings.database_url)
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


def get_session_repo(db: Annotated[Database, Depends(get_database)]) -> SessionRepository:
    return SQLiteSessionRepository(db)


async def get_current_session(
    request: Request,
    session_repo: Annotated[SessionRepository, Depends(get_session_repo)],
) -> Session:
    """Extract and validate the current session from the cb_session cookie."""
    session_token = request.cookies.get(settings.session_cookie_name)
    if not session_token:
        raise UnauthorizedError("Missing session cookie")

    session = await session_repo.get_by_id(session_token)
    if not session:
        raise UnauthorizedError("Invalid session")

    now = int(time.time())
    if session.expires_at < now:
        raise UnauthorizedError("Session expired")

    if session.revoked_at is not None:
        raise UnauthorizedError("Session revoked")

    await session_repo.update_last_seen(session.id, now)
    return session


async def get_current_user(
    request: Request,
    session_repo: Annotated[SessionRepository, Depends(get_session_repo)],
    user_repo: Annotated[UserRepository, Depends(get_user_repo)],
) -> User:
    """Extract and validate the current user from the session cookie."""
    session = await get_current_session(request, session_repo)

    user = await user_repo.find_by_id(session.user_id)
    if not user:
        raise UnauthorizedError("User not found")

    return user
