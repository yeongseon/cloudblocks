"""CloudBlocks API - Database connection and migration management.

Uses aiosqlite for local development. The metadata DB only stores:
  - User / identity records
  - Workspace index (pointers to GitHub repos)
  - Generation run status
Architecture data lives in GitHub repos, NOT here.
"""

from __future__ import annotations

from contextlib import suppress
from typing import Any, Protocol

import aiosqlite
import asyncpg

from app.infrastructure.db.pg_migrations import PG_MIGRATIONS

_MIGRATIONS = [
    # Migration 001: Users and identities
    """
    CREATE TABLE IF NOT EXISTS users (
        id              TEXT PRIMARY KEY,
        github_id       TEXT UNIQUE,
        github_username TEXT,
        email           TEXT,
        display_name    TEXT,
        avatar_url      TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS identities (
        id                 TEXT PRIMARY KEY,
        user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider           TEXT NOT NULL,
        provider_id        TEXT NOT NULL,
        access_token_hash  TEXT,
        encrypted_access_token TEXT,
        refresh_token_hash TEXT,
        created_at         TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(provider, provider_id)
    );
    """,
    # Migration 002: Workspaces and generation runs
    """
    CREATE TABLE IF NOT EXISTS workspaces (
        id              TEXT PRIMARY KEY,
        owner_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name            TEXT NOT NULL,
        github_repo     TEXT,
        github_branch   TEXT DEFAULT 'main',
        generator       TEXT DEFAULT 'terraform',
        provider        TEXT DEFAULT 'azure',
        last_synced_at  TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS generation_runs (
        id              TEXT PRIMARY KEY,
        workspace_id    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        status          TEXT NOT NULL DEFAULT 'pending',
        generator       TEXT NOT NULL,
        commit_sha      TEXT,
        pull_request_url TEXT,
        error_message   TEXT,
        started_at      TEXT,
        completed_at    TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    """,
    # Migration 003: Add encrypted token storage for GitHub OAuth
    """
    ALTER TABLE identities ADD COLUMN encrypted_access_token TEXT;
    """,
    # Migration 004: Sessions table for cookie-based auth
    """
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        revoked_at INTEGER,
        last_seen_at INTEGER,
        current_workspace_id TEXT,
        current_repo_full_name TEXT
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    """,
]


class Database:
    """Async SQLite connection manager for the metadata database."""

    def __init__(self, database_path: str = "cloudblocks.db") -> None:
        self.database_path = database_path
        self._db: aiosqlite.Connection | None = None

    @classmethod
    def from_url(cls, url: str) -> Database:
        """Create a Database instance from a database URL.

        Handles SQLite URL formats:
        - sqlite+aiosqlite:///cloudblocks.db → cloudblocks.db
        - sqlite+aiosqlite:////abs/path/db.sqlite → /abs/path/db.sqlite
        - cloudblocks.db → cloudblocks.db (plain path)
        """
        # Handle sqlite+aiosqlite:/// URLs
        if url.startswith("sqlite+aiosqlite:///"):
            # Remove the prefix: sqlite+aiosqlite:///
            path = url[len("sqlite+aiosqlite:///") :]
            # Handle absolute paths (four slashes in original = one leading slash after removal)
            if path.startswith("/"):
                # Four slashes case: sqlite+aiosqlite:////abs/path → /abs/path
                return cls(path)
            else:
                # Three slashes case: sqlite+aiosqlite:///relative/path → relative/path
                return cls(path)
        else:
            # Plain path format
            return cls(url)

    async def connect(self) -> None:
        """Open the database connection and run migrations."""
        self._db = await aiosqlite.connect(self.database_path)
        self._db.row_factory = aiosqlite.Row
        await self._db.execute("PRAGMA journal_mode=WAL")
        await self._db.execute("PRAGMA foreign_keys=ON")
        await self._run_migrations()

    async def disconnect(self) -> None:
        """Close the database connection."""
        if self._db:
            await self._db.close()
            self._db = None

    async def _run_migrations(self) -> None:
        """Run all schema migrations."""
        if not self._db:
            return
        for migration in _MIGRATIONS:
            with suppress(Exception):
                await self._db.execute(migration)
        await self._db.commit()

    @property
    def connection(self) -> aiosqlite.Connection:
        """Get the active connection, raising if not connected."""
        if not self._db:
            raise RuntimeError("Database not connected. Call connect() first.")
        return self._db

    async def execute(self, query: str, params: tuple[object, ...] = ()) -> aiosqlite.Cursor:
        """Execute a SQL query."""
        cursor = await self.connection.execute(query, params)
        await self.connection.commit()
        return cursor

    async def fetch_one(
        self, query: str, params: tuple[object, ...] = ()
    ) -> dict[str, object] | None:
        """Execute a query and return the first row as a dict."""
        cursor = await self.connection.execute(query, params)
        row = await cursor.fetchone()
        if row is None:
            return None
        return dict(row)

    async def fetch_all(
        self, query: str, params: tuple[object, ...] = ()
    ) -> list[dict[str, object]]:
        """Execute a query and return all rows as dicts."""
        cursor = await self.connection.execute(query, params)
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


class DatabaseProtocol(Protocol):
    async def connect(self) -> None: ...

    async def disconnect(self) -> None: ...

    async def execute(self, query: str, params: tuple[object, ...] = ()) -> Any: ...

    async def fetch_one(
        self, query: str, params: tuple[object, ...] = ()
    ) -> dict[str, object] | None: ...

    async def fetch_all(
        self, query: str, params: tuple[object, ...] = ()
    ) -> list[dict[str, object]]: ...


class PostgresDatabase:
    """Async PostgreSQL connection manager for the metadata database."""

    def __init__(self, dsn: str, min_size: int = 2, max_size: int = 10) -> None:
        self.dsn = dsn
        self.min_size = min_size
        self.max_size = max_size
        self._pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        """Create the connection pool and run migrations."""
        self._pool = await asyncpg.create_pool(
            dsn=self.dsn,
            min_size=self.min_size,
            max_size=self.max_size,
        )
        await self._run_migrations()

    async def disconnect(self) -> None:
        """Close the connection pool."""
        if self._pool:
            await self._pool.close()
            self._pool = None

    async def _run_migrations(self) -> None:
        """Run all schema migrations."""
        if not self._pool:
            return
        for migration in PG_MIGRATIONS:
            await self._pool.execute(migration)

    @property
    def connection(self) -> asyncpg.Pool:
        """Get the active pool, raising if not connected."""
        if not self._pool:
            raise RuntimeError("Database not connected. Call connect() first.")
        return self._pool

    async def execute(self, query: str, params: tuple[object, ...] = ()) -> str:
        """Execute a SQL query and return asyncpg status string."""
        return await self.connection.execute(query, *params)

    async def fetch_one(
        self, query: str, params: tuple[object, ...] = ()
    ) -> dict[str, object] | None:
        """Execute a query and return the first row as a dict."""
        row = await self.connection.fetchrow(query, *params)
        if row is None:
            return None
        return dict(row)

    async def fetch_all(
        self, query: str, params: tuple[object, ...] = ()
    ) -> list[dict[str, object]]:
        """Execute a query and return all rows as dicts."""
        rows = await self.connection.fetch(query, *params)
        return [dict(row) for row in rows]


def create_database(url: str) -> Database | PostgresDatabase:
    """Create database backend from DATABASE_URL."""
    if url.startswith("postgres://") or url.startswith("postgresql://"):
        return PostgresDatabase(url)
    return Database.from_url(url)
