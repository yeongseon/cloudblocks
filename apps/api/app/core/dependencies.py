"""CloudBlocks API - Dependency injection container.

Provides FastAPI dependencies for database, repositories, services, and auth.
"""

from __future__ import annotations

import time
from typing import Annotated, cast

from fastapi import Depends, Request

from app.application.use_cases.ai_keys_use_cases import (
    DeleteAIKeyUseCase,
    ListAIKeysUseCase,
    StoreAIKeyUseCase,
)
from app.application.use_cases.ai_use_cases import (
    EstimateArchitectureCostUseCase,
    GenerateArchitectureUseCase,
    SuggestArchitectureImprovementsUseCase,
)
from app.application.use_cases.auth_use_cases import (
    CompleteGitHubOAuthUseCase,
    GetSessionUserUseCase,
    LogoutUseCase,
    StartGitHubOAuthUseCase,
)
from app.application.use_cases.generation_use_cases import (
    GetGenerationStatusUseCase,
    PreviewGenerationUseCase,
    TriggerGenerationUseCase,
)
from app.application.use_cases.github_use_cases import (
    CreateGitHubRepoUseCase,
    CreateWorkspacePullRequestUseCase,
    ListGitHubReposUseCase,
    ListWorkspaceCommitsUseCase,
    PullWorkspaceArchitectureUseCase,
    SyncWorkspaceToGitHubUseCase,
)
from app.application.use_cases.session_use_cases import BindWorkspaceToSessionUseCase
from app.application.use_cases.workspace_use_cases import (
    CreateWorkspaceUseCase,
    DeleteWorkspaceUseCase,
    GetWorkspaceUseCase,
    ListWorkspacesUseCase,
    UpdateWorkspaceUseCase,
)
from app.core.config import settings
from app.core.errors import UnauthorizedError
from app.domain.models.entities import Session, User
from app.domain.models.repositories import (
    AIApiKeyRepository,
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
from app.infrastructure.llm.key_manager import KeyManager

_github_service = GitHubService(
    client_id=settings.github_client_id,
    client_secret=settings.github_client_secret,
)


_db = create_database(settings.database_url)
_redis_client: RedisClient | None = None
_key_manager = KeyManager(settings.ai_encryption_key)


def get_database() -> DatabaseProtocol:
    return _db


def get_redis_client() -> RedisClient | None:
    return _redis_client


def get_github_service() -> GitHubService:
    return _github_service


def get_key_manager() -> KeyManager:
    return _key_manager


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


def get_ai_api_key_repo(
    db: Annotated[DatabaseProtocol, Depends(get_database)],
) -> AIApiKeyRepository:
    if isinstance(db, PostgresDatabase):
        from app.infrastructure.db.pg_repositories import PgAIApiKeyRepository

        return PgAIApiKeyRepository(db)

    from app.infrastructure.db.repositories import SQLiteAIApiKeyRepository

    return SQLiteAIApiKeyRepository(cast(Database, db))


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


def get_list_workspaces_use_case(
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
) -> ListWorkspacesUseCase:
    return ListWorkspacesUseCase(workspace_repo)


def get_create_workspace_use_case(
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
) -> CreateWorkspaceUseCase:
    return CreateWorkspaceUseCase(workspace_repo)


def get_workspace_use_case(
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
) -> GetWorkspaceUseCase:
    return GetWorkspaceUseCase(workspace_repo)


def get_update_workspace_use_case(
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
) -> UpdateWorkspaceUseCase:
    return UpdateWorkspaceUseCase(workspace_repo)


def get_delete_workspace_use_case(
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
) -> DeleteWorkspaceUseCase:
    return DeleteWorkspaceUseCase(workspace_repo)


def get_start_github_oauth_use_case(
    github_service: Annotated[GitHubService, Depends(get_github_service)],
) -> StartGitHubOAuthUseCase:
    return StartGitHubOAuthUseCase(github_service, settings.github_redirect_uri)


def get_complete_github_oauth_use_case(
    github_service: Annotated[GitHubService, Depends(get_github_service)],
    user_repo: Annotated[UserRepository, Depends(get_user_repo)],
    identity_repo: Annotated[IdentityRepository, Depends(get_identity_repo)],
    session_repo: Annotated[SessionRepository, Depends(get_session_repo)],
) -> CompleteGitHubOAuthUseCase:
    return CompleteGitHubOAuthUseCase(
        github_service,
        user_repo,
        identity_repo,
        session_repo,
        settings.oauth_state_ttl_minutes,
        settings.session_ttl_hours,
    )


def get_session_user_use_case(
    session_repo: Annotated[SessionRepository, Depends(get_session_repo)],
    user_repo: Annotated[UserRepository, Depends(get_user_repo)],
) -> GetSessionUserUseCase:
    return GetSessionUserUseCase(session_repo, user_repo)


def get_logout_use_case(
    session_repo: Annotated[SessionRepository, Depends(get_session_repo)],
) -> LogoutUseCase:
    return LogoutUseCase(session_repo)


def get_list_github_repos_use_case(
    identity_repo: Annotated[IdentityRepository, Depends(get_identity_repo)],
    github_service: Annotated[GitHubService, Depends(get_github_service)],
) -> ListGitHubReposUseCase:
    return ListGitHubReposUseCase(identity_repo, github_service)


def get_create_github_repo_use_case(
    identity_repo: Annotated[IdentityRepository, Depends(get_identity_repo)],
    github_service: Annotated[GitHubService, Depends(get_github_service)],
) -> CreateGitHubRepoUseCase:
    return CreateGitHubRepoUseCase(identity_repo, github_service)


def get_sync_workspace_to_github_use_case(
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
    identity_repo: Annotated[IdentityRepository, Depends(get_identity_repo)],
    github_service: Annotated[GitHubService, Depends(get_github_service)],
) -> SyncWorkspaceToGitHubUseCase:
    return SyncWorkspaceToGitHubUseCase(workspace_repo, identity_repo, github_service)


def get_pull_workspace_architecture_use_case(
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
    identity_repo: Annotated[IdentityRepository, Depends(get_identity_repo)],
    github_service: Annotated[GitHubService, Depends(get_github_service)],
) -> PullWorkspaceArchitectureUseCase:
    return PullWorkspaceArchitectureUseCase(workspace_repo, identity_repo, github_service)


def get_create_workspace_pull_request_use_case(
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
    identity_repo: Annotated[IdentityRepository, Depends(get_identity_repo)],
    github_service: Annotated[GitHubService, Depends(get_github_service)],
) -> CreateWorkspacePullRequestUseCase:
    return CreateWorkspacePullRequestUseCase(workspace_repo, identity_repo, github_service)


def get_list_workspace_commits_use_case(
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
    identity_repo: Annotated[IdentityRepository, Depends(get_identity_repo)],
    github_service: Annotated[GitHubService, Depends(get_github_service)],
) -> ListWorkspaceCommitsUseCase:
    return ListWorkspaceCommitsUseCase(workspace_repo, identity_repo, github_service)


def get_generate_architecture_use_case(
    ai_api_key_repo: Annotated[AIApiKeyRepository, Depends(get_ai_api_key_repo)],
    key_manager: Annotated[KeyManager, Depends(get_key_manager)],
) -> GenerateArchitectureUseCase:
    return GenerateArchitectureUseCase(
        ai_api_key_repo,
        key_manager,
        settings.llm_provider_url,
        settings.llm_model,
        settings.llm_max_tokens,
        settings.llm_request_timeout,
    )


def get_suggest_architecture_improvements_use_case(
    ai_api_key_repo: Annotated[AIApiKeyRepository, Depends(get_ai_api_key_repo)],
    key_manager: Annotated[KeyManager, Depends(get_key_manager)],
) -> SuggestArchitectureImprovementsUseCase:
    return SuggestArchitectureImprovementsUseCase(
        ai_api_key_repo,
        key_manager,
        settings.llm_provider_url,
        settings.llm_model,
        settings.llm_max_tokens,
        settings.llm_request_timeout,
    )


def get_estimate_architecture_cost_use_case() -> EstimateArchitectureCostUseCase:
    return EstimateArchitectureCostUseCase(settings.infracost_api_key)


def get_store_ai_key_use_case(
    ai_api_key_repo: Annotated[AIApiKeyRepository, Depends(get_ai_api_key_repo)],
    key_manager: Annotated[KeyManager, Depends(get_key_manager)],
) -> StoreAIKeyUseCase:
    return StoreAIKeyUseCase(ai_api_key_repo, key_manager)


def get_list_ai_keys_use_case(
    ai_api_key_repo: Annotated[AIApiKeyRepository, Depends(get_ai_api_key_repo)],
) -> ListAIKeysUseCase:
    return ListAIKeysUseCase(ai_api_key_repo)


def get_delete_ai_key_use_case(
    ai_api_key_repo: Annotated[AIApiKeyRepository, Depends(get_ai_api_key_repo)],
) -> DeleteAIKeyUseCase:
    return DeleteAIKeyUseCase(ai_api_key_repo)


def get_trigger_generation_use_case(
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
    run_repo: Annotated[GenerationRunRepository, Depends(get_generation_run_repo)],
) -> TriggerGenerationUseCase:
    return TriggerGenerationUseCase(workspace_repo, run_repo)


def get_generation_status_use_case(
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
    run_repo: Annotated[GenerationRunRepository, Depends(get_generation_run_repo)],
) -> GetGenerationStatusUseCase:
    return GetGenerationStatusUseCase(workspace_repo, run_repo)


def get_preview_generation_use_case(
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
) -> PreviewGenerationUseCase:
    return PreviewGenerationUseCase(workspace_repo)


def get_bind_workspace_to_session_use_case(
    session_repo: Annotated[SessionRepository, Depends(get_session_repo)],
    workspace_repo: Annotated[WorkspaceRepository, Depends(get_workspace_repo)],
) -> BindWorkspaceToSessionUseCase:
    return BindWorkspaceToSessionUseCase(session_repo, workspace_repo)


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
