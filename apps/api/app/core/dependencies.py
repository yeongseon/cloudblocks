"""CloudBlocks API - Dependency injection container.

Provides FastAPI dependencies for database, repositories, services, and auth.
"""

from __future__ import annotations

import time
from typing import Annotated, cast

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
from app.infrastructure.cache.redis_client import RedisClient
from app.infrastructure.cache.redis_session_repo import RedisSessionRepository
from app.infrastructure.db.connection import (
    Database,
    DatabaseProtocol,
    PostgresDatabase,
    create_database,
)
from app.infrastructure.github_service import GitHubService

_github_service = GitHubService(
    client_id=settings.github_client_id,
    client_secret=settings.github_client_secret,
)


_db = create_database(settings.database_url)
_redis_client: RedisClient | None = None


def get_database() -> DatabaseProtocol:
    return _db


def get_github_service() -> GitHubService:
    return _github_service


def get_user_repo(db: Annotated[DatabaseProtocol, Depends(get_database)]) -> UserRepository:
    if isinstance(db, PostgresDatabase):
        from app.infrastructure.db.pg_repositories import PgUserRepository

        return PgUserRepository(db)

    from app.infrastructure.db.repositories import SQLiteUserRepository

    return SQLiteUserRepository(cast(Database, db))


def get_identity_repo(db: Annotated[DatabaseProtocol, Depends(get_database)]) -> IdentityRepository:
    if isinstance(db, PostgresDatabase):
        from app.infrastructure.db.pg_repositories import PgIdentityRepository

        return PgIdentityRepository(db)

    from app.infrastructure.db.repositories import SQLiteIdentityRepository

    return SQLiteIdentityRepository(cast(Database, db))


def get_workspace_repo(
    db: Annotated[DatabaseProtocol, Depends(get_database)],
) -> WorkspaceRepository:
    if isinstance(db, PostgresDatabase):
        from app.infrastructure.db.pg_repositories import PgWorkspaceRepository

        return PgWorkspaceRepository(db)

    from app.infrastructure.db.repositories import SQLiteWorkspaceRepository

    return SQLiteWorkspaceRepository(cast(Database, db))


def get_generation_run_repo(
    db: Annotated[DatabaseProtocol, Depends(get_database)],
) -> GenerationRunRepository:
    if isinstance(db, PostgresDatabase):
        from app.infrastructure.db.pg_repositories import PgGenerationRunRepository

        return PgGenerationRunRepository(db)

    from app.infrastructure.db.repositories import SQLiteGenerationRunRepository

    return SQLiteGenerationRunRepository(cast(Database, db))


def get_session_repo(db: Annotated[DatabaseProtocol, Depends(get_database)]) -> SessionRepository:
    if settings.session_backend == "redis":
        if _redis_client is None:
            raise RuntimeError(
                "Redis session backend is enabled but Redis client is not initialized."
            )
        return RedisSessionRepository(
            _redis_client,
            sliding_ttl_days=settings.redis_session_sliding_ttl_days,
            absolute_ttl_days=settings.redis_session_absolute_ttl_days,
        )

    if isinstance(db, PostgresDatabase):
        from app.infrastructure.db.pg_repositories import PgSessionRepository

        return PgSessionRepository(db)

    from app.infrastructure.db.repositories import SQLiteSessionRepository

    return SQLiteSessionRepository(cast(Database, db))


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
