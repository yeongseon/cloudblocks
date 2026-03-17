"""CloudBlocks API - Database connection and migration management.

Uses aiosqlite for local development. The metadata DB only stores:
  - User / identity records
  - Workspace index (pointers to GitHub repos)
  - Generation run status
Architecture data lives in GitHub repos, NOT here.
"""

from __future__ import annotations

from contextlib import suppress

import aiosqlite

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
]


class Database:
    """Async SQLite connection manager for the metadata database."""

    def __init__(self, database_path: str = "cloudblocks.db") -> None:
        self.database_path = database_path
        self._db: aiosqlite.Connection | None = None

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

    async def execute(self, query: str, params: tuple = ()) -> aiosqlite.Cursor:
        """Execute a SQL query."""
        cursor = await self.connection.execute(query, params)
        await self.connection.commit()
        return cursor

    async def fetch_one(self, query: str, params: tuple = ()) -> dict | None:
        """Execute a query and return the first row as a dict."""
        cursor = await self.connection.execute(query, params)
        row = await cursor.fetchone()
        if row is None:
            return None
        return dict(row)

    async def fetch_all(self, query: str, params: tuple = ()) -> list[dict]:
        """Execute a query and return all rows as dicts."""
        cursor = await self.connection.execute(query, params)
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
