"""CloudBlocks API - SQLite repository implementations."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.domain.models.entities import (
    GenerationRun,
    GenerationStatus,
    Identity,
    Session,
    User,
    Workspace,
)
from app.domain.models.repositories import (
    GenerationRunRepository,
    IdentityRepository,
    SessionRepository,
    UserRepository,
    WorkspaceRepository,
)
from app.infrastructure.db.connection import Database


def _parse_dt(value: str | None) -> datetime | None:
    """Parse an ISO datetime string from SQLite."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).replace(tzinfo=timezone.utc)
    except ValueError:
        return datetime.fromisoformat(value + "+00:00")


def _fmt_dt(value: datetime | None) -> str | None:
    """Format a datetime for SQLite storage."""
    if not value:
        return None
    return value.isoformat()


class SQLiteUserRepository(UserRepository):
    """SQLite implementation of UserRepository."""

    def __init__(self, db: Database) -> None:
        self._db = db

    def _row_to_user(self, row: dict[str, Any]) -> User:
        return User(
            id=row["id"],
            github_id=row.get("github_id"),
            github_username=row.get("github_username"),
            email=row.get("email"),
            display_name=row.get("display_name"),
            avatar_url=row.get("avatar_url"),
            created_at=_parse_dt(row.get("created_at")) or datetime.now(timezone.utc),
            updated_at=_parse_dt(row.get("updated_at")) or datetime.now(timezone.utc),
        )

    async def find_by_id(self, user_id: str) -> User | None:
        row = await self._db.fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))
        return self._row_to_user(row) if row else None

    async def find_by_github_id(self, github_id: str) -> User | None:
        row = await self._db.fetch_one("SELECT * FROM users WHERE github_id = ?", (github_id,))
        return self._row_to_user(row) if row else None

    async def create(self, user: User) -> User:
        await self._db.execute(
            """INSERT INTO users (id, github_id, github_username, email, display_name,
               avatar_url, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user.id,
                user.github_id,
                user.github_username,
                user.email,
                user.display_name,
                user.avatar_url,
                _fmt_dt(user.created_at),
                _fmt_dt(user.updated_at),
            ),
        )
        return user

    async def update(self, user: User) -> User:
        user.updated_at = datetime.now(timezone.utc)
        await self._db.execute(
            """UPDATE users SET github_id = ?, github_username = ?, email = ?,
               display_name = ?, avatar_url = ?, updated_at = ?
               WHERE id = ?""",
            (
                user.github_id,
                user.github_username,
                user.email,
                user.display_name,
                user.avatar_url,
                _fmt_dt(user.updated_at),
                user.id,
            ),
        )
        return user


class SQLiteIdentityRepository(IdentityRepository):
    """SQLite implementation of IdentityRepository."""

    def __init__(self, db: Database) -> None:
        self._db = db

    def _row_to_identity(self, row: dict[str, Any]) -> Identity:
        return Identity(
            id=row["id"],
            user_id=row["user_id"],
            provider=row["provider"],
            provider_id=row["provider_id"],
            access_token_hash=row.get("access_token_hash"),
            encrypted_access_token=row.get("encrypted_access_token"),
            refresh_token_hash=row.get("refresh_token_hash"),
            created_at=_parse_dt(row.get("created_at")) or datetime.now(timezone.utc),
        )

    async def find_by_user_id(self, user_id: str) -> list[Identity]:
        rows = await self._db.fetch_all("SELECT * FROM identities WHERE user_id = ?", (user_id,))
        return [self._row_to_identity(row) for row in rows]

    async def find_by_provider(self, provider: str, provider_id: str) -> Identity | None:
        row = await self._db.fetch_one(
            "SELECT * FROM identities WHERE provider = ? AND provider_id = ?",
            (provider, provider_id),
        )
        return self._row_to_identity(row) if row else None

    async def create(self, identity: Identity) -> Identity:
        await self._db.execute(
            """INSERT INTO identities (id, user_id, provider, provider_id,
               access_token_hash, encrypted_access_token, refresh_token_hash, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                identity.id,
                identity.user_id,
                identity.provider,
                identity.provider_id,
                identity.access_token_hash,
                identity.encrypted_access_token,
                identity.refresh_token_hash,
                _fmt_dt(identity.created_at),
            ),
        )
        return identity

    async def update(self, identity: Identity) -> Identity:
        await self._db.execute(
            """UPDATE identities SET access_token_hash = ?, encrypted_access_token = ?,
               refresh_token_hash = ?
               WHERE id = ?""",
            (
                identity.access_token_hash,
                identity.encrypted_access_token,
                identity.refresh_token_hash,
                identity.id,
            ),
        )
        return identity

    async def delete_by_user_id(self, user_id: str) -> int:
        cursor = await self._db.execute("DELETE FROM identities WHERE user_id = ?", (user_id,))
        return cursor.rowcount


class SQLiteWorkspaceRepository(WorkspaceRepository):
    """SQLite implementation of WorkspaceRepository."""

    def __init__(self, db: Database) -> None:
        self._db = db

    def _row_to_workspace(self, row: dict[str, Any]) -> Workspace:
        return Workspace(
            id=row["id"],
            owner_id=row["owner_id"],
            name=row["name"],
            github_repo=row.get("github_repo"),
            github_branch=row.get("github_branch", "main"),
            generator=row.get("generator", "terraform"),
            provider=row.get("provider", "azure"),
            last_synced_at=_parse_dt(row.get("last_synced_at")),
            created_at=_parse_dt(row.get("created_at")) or datetime.now(timezone.utc),
            updated_at=_parse_dt(row.get("updated_at")) or datetime.now(timezone.utc),
        )

    async def find_by_id(self, workspace_id: str) -> Workspace | None:
        row = await self._db.fetch_one("SELECT * FROM workspaces WHERE id = ?", (workspace_id,))
        return self._row_to_workspace(row) if row else None

    async def find_by_owner(self, owner_id: str) -> list[Workspace]:
        rows = await self._db.fetch_all(
            "SELECT * FROM workspaces WHERE owner_id = ? ORDER BY created_at DESC", (owner_id,)
        )
        return [self._row_to_workspace(row) for row in rows]

    async def create(self, workspace: Workspace) -> Workspace:
        await self._db.execute(
            """INSERT INTO workspaces (id, owner_id, name, github_repo, github_branch,
               generator, provider, last_synced_at, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                workspace.id,
                workspace.owner_id,
                workspace.name,
                workspace.github_repo,
                workspace.github_branch,
                workspace.generator,
                workspace.provider,
                _fmt_dt(workspace.last_synced_at),
                _fmt_dt(workspace.created_at),
                _fmt_dt(workspace.updated_at),
            ),
        )
        return workspace

    async def update(self, workspace: Workspace) -> Workspace:
        workspace.updated_at = datetime.now(timezone.utc)
        await self._db.execute(
            """UPDATE workspaces SET name = ?, github_repo = ?, github_branch = ?,
               generator = ?, provider = ?, last_synced_at = ?, updated_at = ?
               WHERE id = ?""",
            (
                workspace.name,
                workspace.github_repo,
                workspace.github_branch,
                workspace.generator,
                workspace.provider,
                _fmt_dt(workspace.last_synced_at),
                _fmt_dt(workspace.updated_at),
                workspace.id,
            ),
        )
        return workspace

    async def delete(self, workspace_id: str) -> bool:
        cursor = await self._db.execute("DELETE FROM workspaces WHERE id = ?", (workspace_id,))
        return cursor.rowcount > 0


class SQLiteGenerationRunRepository(GenerationRunRepository):
    """SQLite implementation of GenerationRunRepository."""

    def __init__(self, db: Database) -> None:
        self._db = db

    def _row_to_run(self, row: dict[str, Any]) -> GenerationRun:
        return GenerationRun(
            id=row["id"],
            workspace_id=row["workspace_id"],
            status=GenerationStatus(row["status"]),
            generator=row["generator"],
            commit_sha=row.get("commit_sha"),
            pull_request_url=row.get("pull_request_url"),
            error_message=row.get("error_message"),
            started_at=_parse_dt(row.get("started_at")),
            completed_at=_parse_dt(row.get("completed_at")),
            created_at=_parse_dt(row.get("created_at")) or datetime.now(timezone.utc),
        )

    async def find_by_id(self, run_id: str) -> GenerationRun | None:
        row = await self._db.fetch_one("SELECT * FROM generation_runs WHERE id = ?", (run_id,))
        return self._row_to_run(row) if row else None

    async def find_by_workspace(self, workspace_id: str) -> list[GenerationRun]:
        rows = await self._db.fetch_all(
            "SELECT * FROM generation_runs WHERE workspace_id = ? ORDER BY created_at DESC",
            (workspace_id,),
        )
        return [self._row_to_run(row) for row in rows]

    async def create(self, run: GenerationRun) -> GenerationRun:
        await self._db.execute(
            """INSERT INTO generation_runs (id, workspace_id, status, generator,
               commit_sha, pull_request_url, error_message, started_at, completed_at, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                run.id,
                run.workspace_id,
                run.status.value,
                run.generator,
                run.commit_sha,
                run.pull_request_url,
                run.error_message,
                _fmt_dt(run.started_at),
                _fmt_dt(run.completed_at),
                _fmt_dt(run.created_at),
            ),
        )
        return run

    async def update(self, run: GenerationRun) -> GenerationRun:
        await self._db.execute(
            """UPDATE generation_runs SET status = ?, commit_sha = ?,
               pull_request_url = ?, error_message = ?,
               started_at = ?, completed_at = ?
               WHERE id = ?""",
            (
                run.status.value,
                run.commit_sha,
                run.pull_request_url,
                run.error_message,
                _fmt_dt(run.started_at),
                _fmt_dt(run.completed_at),
                run.id,
            ),
        )
        return run


class SQLiteSessionRepository(SessionRepository):
    """SQLite implementation of SessionRepository."""

    def __init__(self, db: Database) -> None:
        self._db = db

    def _row_to_session(self, row: dict[str, Any]) -> Session:
        return Session(
            id=row["id"],
            user_id=row["user_id"],
            created_at=row["created_at"],
            expires_at=row["expires_at"],
            revoked_at=row.get("revoked_at"),
            last_seen_at=row.get("last_seen_at"),
            current_workspace_id=row.get("current_workspace_id"),
            current_repo_full_name=row.get("current_repo_full_name"),
        )

    async def create(self, session: Session) -> Session:
        await self._db.execute(
            """INSERT INTO sessions (id, user_id, created_at, expires_at, revoked_at,
               last_seen_at, current_workspace_id, current_repo_full_name)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                session.id,
                session.user_id,
                session.created_at,
                session.expires_at,
                session.revoked_at,
                session.last_seen_at,
                session.current_workspace_id,
                session.current_repo_full_name,
            ),
        )
        return session

    async def get_by_id(self, session_id: str) -> Session | None:
        row = await self._db.fetch_one("SELECT * FROM sessions WHERE id = ?", (session_id,))
        return self._row_to_session(row) if row else None

    async def revoke(self, session_id: str) -> None:
        import time

        await self._db.execute(
            "UPDATE sessions SET revoked_at = ? WHERE id = ?",
            (int(time.time()), session_id),
        )

    async def revoke_all_for_user(self, user_id: str) -> None:
        import time

        await self._db.execute(
            "UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
            (int(time.time()), user_id),
        )

    async def update_last_seen(self, session_id: str, timestamp: int) -> None:
        await self._db.execute(
            "UPDATE sessions SET last_seen_at = ? WHERE id = ?",
            (timestamp, session_id),
        )

    async def update_workspace(
        self,
        session_id: str,
        workspace_id: str,
        repo_full_name: str | None,
    ) -> None:
        await self._db.execute(
            "UPDATE sessions SET current_workspace_id = ?, current_repo_full_name = ? WHERE id = ?",
            (workspace_id, repo_full_name, session_id),
        )

    async def cleanup_expired(self) -> int:
        import time

        cursor = await self._db.execute(
            "DELETE FROM sessions WHERE expires_at < ?",
            (int(time.time()),),
        )
        return cursor.rowcount
