from __future__ import annotations

import aiosqlite
import pytest

from app.infrastructure.db.connection import Database


async def test_database_init_sets_database_path() -> None:
    db = Database(":memory:")

    assert db.database_path == ":memory:"


async def test_connect_opens_connection_sets_pragma_and_runs_migrations() -> None:
    db = Database(":memory:")
    await db.connect()

    assert db.connection is not None
    assert db.connection.row_factory is aiosqlite.Row

    pragma_row = await db.fetch_one("PRAGMA foreign_keys")
    assert pragma_row == {"foreign_keys": 1}

    tables = await db.fetch_all(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    )
    table_names = {row["name"] for row in tables}
    assert {"users", "identities", "workspaces", "generation_runs"}.issubset(table_names)

    await db.disconnect()


async def test_disconnect_closes_connection_and_sets_none() -> None:
    db = Database(":memory:")
    await db.connect()

    raw_conn = db.connection
    await db.disconnect()

    assert db._db is None
    assert raw_conn._connection is None


async def test_disconnect_when_already_disconnected_is_noop() -> None:
    db = Database(":memory:")

    await db.disconnect()

    assert db._db is None


async def test_connection_property_returns_connection_when_connected() -> None:
    db = Database(":memory:")
    await db.connect()

    conn = db.connection

    assert conn is db._db
    await db.disconnect()


async def test_connection_property_raises_when_not_connected() -> None:
    db = Database(":memory:")

    with pytest.raises(RuntimeError, match="Database not connected"):
        _ = db.connection


async def test_execute_executes_query_and_commits() -> None:
    db = Database(":memory:")
    await db.connect()

    cursor = await db.execute(
        "INSERT INTO users (id, github_id, github_username, email, display_name) "
        "VALUES (?, ?, ?, ?, ?)",
        ("u1", "gh1", "user1", "u1@test.com", "User One"),
    )

    assert cursor.rowcount == 1

    inserted = await db.fetch_one("SELECT id, github_username FROM users WHERE id = ?", ("u1",))
    assert inserted == {"id": "u1", "github_username": "user1"}

    await db.disconnect()


async def test_fetch_one_returns_dict_or_none() -> None:
    db = Database(":memory:")
    await db.connect()

    await db.execute(
        "INSERT INTO users (id, github_id, github_username, email, display_name) "
        "VALUES (?, ?, ?, ?, ?)",
        ("u2", "gh2", "user2", "u2@test.com", "User Two"),
    )

    found = await db.fetch_one("SELECT id, email FROM users WHERE id = ?", ("u2",))
    missing = await db.fetch_one("SELECT id FROM users WHERE id = ?", ("missing",))

    assert found == {"id": "u2", "email": "u2@test.com"}
    assert missing is None

    await db.disconnect()


async def test_fetch_all_returns_list_of_dicts() -> None:
    db = Database(":memory:")
    await db.connect()

    await db.execute(
        "INSERT INTO users (id, github_id, github_username, email, display_name) "
        "VALUES (?, ?, ?, ?, ?)",
        ("u3", "gh3", "user3", "u3@test.com", "User Three"),
    )
    await db.execute(
        "INSERT INTO users (id, github_id, github_username, email, display_name) "
        "VALUES (?, ?, ?, ?, ?)",
        ("u4", "gh4", "user4", "u4@test.com", "User Four"),
    )

    rows = await db.fetch_all("SELECT id, github_id FROM users ORDER BY id")

    assert rows == [{"id": "u3", "github_id": "gh3"}, {"id": "u4", "github_id": "gh4"}]

    await db.disconnect()


async def test_run_migrations_returns_early_when_not_connected() -> None:
    db = Database(":memory:")

    await db._run_migrations()

    assert db._db is None
