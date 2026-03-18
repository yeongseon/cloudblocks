from __future__ import annotations

from typing import Any

import pytest

from app.infrastructure.db.connection import Database, PostgresDatabase, create_database
from app.infrastructure.db.pg_migrations import PG_MIGRATIONS


class FakePool:
    def __init__(self) -> None:
        self.closed = False
        self.executed: list[str] = []
        self.fetchrow_result: dict[str, Any] | None = None
        self.fetch_result: list[dict[str, Any]] = []

    async def close(self) -> None:
        self.closed = True

    async def execute(self, query: str, *params: object) -> str:
        self.executed.append(query)
        return "UPDATE 1"

    async def fetchrow(self, query: str, *params: object) -> dict[str, Any] | None:
        _ = query, params
        return self.fetchrow_result

    async def fetch(self, query: str, *params: object) -> list[dict[str, Any]]:
        _ = query, params
        return self.fetch_result


async def test_create_database_returns_postgres_instance_for_postgres_urls() -> None:
    assert isinstance(
        create_database("postgresql://user:pass@localhost/cloudblocks"),
        PostgresDatabase,
    )
    assert isinstance(
        create_database("postgres://user:pass@localhost/cloudblocks"),
        PostgresDatabase,
    )


async def test_create_database_returns_sqlite_database_for_sqlite_url() -> None:
    db = create_database("sqlite+aiosqlite:///cloudblocks.db")

    assert isinstance(db, Database)
    assert db.database_path == "cloudblocks.db"


async def test_postgres_connect_runs_pool_creation_and_migrations(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_pool = FakePool()
    create_pool_calls: list[dict[str, object]] = []

    async def fake_create_pool(**kwargs: object) -> FakePool:
        create_pool_calls.append(kwargs)
        return fake_pool

    monkeypatch.setattr("app.infrastructure.db.connection.asyncpg.create_pool", fake_create_pool)

    db = PostgresDatabase("postgresql://user:pass@localhost/cloudblocks", min_size=3, max_size=7)
    await db.connect()

    assert db.connection is fake_pool
    assert create_pool_calls == [
        {
            "dsn": "postgresql://user:pass@localhost/cloudblocks",
            "min_size": 3,
            "max_size": 7,
        }
    ]
    assert len(fake_pool.executed) == len(PG_MIGRATIONS)

    await db.disconnect()
    assert fake_pool.closed is True


async def test_postgres_connection_property_raises_when_not_connected() -> None:
    db = PostgresDatabase("postgresql://user:pass@localhost/cloudblocks")

    with pytest.raises(RuntimeError, match="Database not connected"):
        _ = db.connection


async def test_postgres_execute_fetch_one_fetch_all(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_pool = FakePool()

    async def fake_create_pool(**kwargs: object) -> FakePool:
        _ = kwargs
        return fake_pool

    monkeypatch.setattr("app.infrastructure.db.connection.asyncpg.create_pool", fake_create_pool)

    db = PostgresDatabase("postgresql://user:pass@localhost/cloudblocks")
    await db.connect()

    fake_pool.fetchrow_result = {"id": "u1"}
    fake_pool.fetch_result = [{"id": "u1"}, {"id": "u2"}]

    status = await db.execute("UPDATE users SET email = $1 WHERE id = $2", ("a@test.com", "u1"))
    one = await db.fetch_one("SELECT id FROM users WHERE id = $1", ("u1",))
    many = await db.fetch_all("SELECT id FROM users ORDER BY id")

    assert status == "UPDATE 1"
    assert one == {"id": "u1"}
    assert many == [{"id": "u1"}, {"id": "u2"}]

    await db.disconnect()
