from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from datetime import datetime, timedelta, timezone

import pytest_asyncio

from app.domain.models.entities import GenerationRun, GenerationStatus, Identity, User, Workspace
from app.infrastructure.db.connection import Database
from app.infrastructure.db.repositories import (
    SQLiteGenerationRunRepository,
    SQLiteIdentityRepository,
    SQLiteSessionRepository,
    SQLiteUserRepository,
    SQLiteWorkspaceRepository,
    _fmt_dt,
    _parse_dt,
)
from app.domain.models.entities import Session


@pytest_asyncio.fixture(name="db")
async def db_fixture() -> AsyncIterator[Database]:
    database = Database(":memory:")
    await database.connect()
    try:
        yield database
    finally:
        await database.disconnect()


def test_parse_dt_with_none_and_iso_values() -> None:
    assert _parse_dt(None) is None

    iso_with_tz = "2026-01-01T01:02:03+00:00"
    parsed_with_tz = _parse_dt(iso_with_tz)
    assert parsed_with_tz == datetime(2026, 1, 1, 1, 2, 3, tzinfo=timezone.utc)

    iso_without_tz = "2026-01-01T01:02:03"
    parsed_without_tz = _parse_dt(iso_without_tz)
    assert parsed_without_tz == datetime(2026, 1, 1, 1, 2, 3, tzinfo=timezone.utc)


def test_fmt_dt_with_none_and_datetime() -> None:
    assert _fmt_dt(None) is None

    value = datetime(2026, 1, 1, 1, 2, 3, tzinfo=timezone.utc)
    assert _fmt_dt(value) == value.isoformat()


async def test_user_repository_create_and_find_methods(db: Database) -> None:
    repo = SQLiteUserRepository(db)
    user = User(
        id="user1",
        github_id="gh123",
        github_username="testuser",
        email="test@test.com",
        display_name="Test",
    )

    created = await repo.create(user)
    by_id = await repo.find_by_id("user1")
    missing_by_id = await repo.find_by_id("missing")
    by_gh = await repo.find_by_github_id("gh123")
    missing_by_gh = await repo.find_by_github_id("gh-missing")

    assert created == user
    assert by_id is not None and by_id.id == "user1"
    assert by_id.github_username == "testuser"
    assert missing_by_id is None
    assert by_gh is not None and by_gh.id == "user1"
    assert missing_by_gh is None


async def test_user_repository_update_changes_fields_and_updated_at(db: Database) -> None:
    repo = SQLiteUserRepository(db)
    user = User(
        id="user2",
        github_id="gh200",
        github_username="before",
        email="before@test.com",
        display_name="Before",
        avatar_url="https://example.com/before.png",
    )
    await repo.create(user)
    before_updated_at = user.updated_at

    await asyncio.sleep(0.001)
    user.github_username = "after"
    user.email = "after@test.com"
    user.display_name = "After"
    user.avatar_url = "https://example.com/after.png"
    updated = await repo.update(user)
    fetched = await repo.find_by_id("user2")

    assert updated.github_username == "after"
    assert updated.updated_at > before_updated_at
    assert fetched is not None
    assert fetched.github_username == "after"
    assert fetched.email == "after@test.com"
    assert fetched.display_name == "After"
    assert fetched.avatar_url == "https://example.com/after.png"


async def test_identity_repository_crud_and_queries(db: Database) -> None:
    user_repo = SQLiteUserRepository(db)
    identity_repo = SQLiteIdentityRepository(db)

    await user_repo.create(
        User(
            id="owner1",
            github_id="gh-owner",
            github_username="owner",
            email="owner@test.com",
            display_name="Owner",
        )
    )

    identity = Identity(
        id="ident1",
        user_id="owner1",
        provider="github",
        provider_id="gh-owner",
        access_token_hash="a1",
        refresh_token_hash="r1",
    )
    await identity_repo.create(identity)

    by_user = await identity_repo.find_by_user_id("owner1")
    by_user_missing = await identity_repo.find_by_user_id("unknown-user")
    by_provider = await identity_repo.find_by_provider("github", "gh-owner")
    by_provider_missing = await identity_repo.find_by_provider("github", "unknown")

    assert len(by_user) == 1
    assert by_user[0].id == "ident1"
    assert by_user_missing == []
    assert by_provider is not None and by_provider.id == "ident1"
    assert by_provider_missing is None

    identity.access_token_hash = "a2"
    identity.refresh_token_hash = "r2"
    updated = await identity_repo.update(identity)
    fetched_after_update = await identity_repo.find_by_provider("github", "gh-owner")
    assert updated.access_token_hash == "a2"
    assert fetched_after_update is not None
    assert fetched_after_update.access_token_hash == "a2"
    assert fetched_after_update.refresh_token_hash == "r2"

    deleted_count = await identity_repo.delete_by_user_id("owner1")
    deleted_again_count = await identity_repo.delete_by_user_id("owner1")
    assert deleted_count == 1
    assert deleted_again_count == 0


async def test_workspace_repository_create_find_update_delete(db: Database) -> None:
    user_repo = SQLiteUserRepository(db)
    workspace_repo = SQLiteWorkspaceRepository(db)

    await user_repo.create(
        User(
            id="ws-owner",
            github_id="gh-ws-owner",
            github_username="wsowner",
            email="ws@test.com",
            display_name="WS Owner",
        )
    )

    now = datetime.now(timezone.utc)
    old_workspace = Workspace(
        id="ws-old",
        owner_id="ws-owner",
        name="Old",
        github_repo="org/old",
        created_at=now - timedelta(days=1),
    )
    new_workspace = Workspace(
        id="ws-new",
        owner_id="ws-owner",
        name="New",
        github_repo="org/new",
        created_at=now,
    )

    await workspace_repo.create(old_workspace)
    await workspace_repo.create(new_workspace)

    found = await workspace_repo.find_by_id("ws-new")
    missing = await workspace_repo.find_by_id("ws-missing")
    by_owner = await workspace_repo.find_by_owner("ws-owner")

    assert found is not None and found.id == "ws-new"
    assert missing is None
    assert [item.id for item in by_owner] == ["ws-new", "ws-old"]

    await asyncio.sleep(0.001)
    old_workspace.name = "Old Updated"
    old_workspace.github_repo = "org/updated"
    old_workspace.github_branch = "dev"
    old_workspace.generator = "pulumi"
    old_workspace.provider = "aws"
    old_workspace.last_synced_at = datetime.now(timezone.utc)

    updated = await workspace_repo.update(old_workspace)
    updated_fetched = await workspace_repo.find_by_id("ws-old")

    assert updated.name == "Old Updated"
    assert updated_fetched is not None
    assert updated_fetched.name == "Old Updated"
    assert updated_fetched.github_repo == "org/updated"
    assert updated_fetched.github_branch == "dev"
    assert updated_fetched.generator == "pulumi"
    assert updated_fetched.provider == "aws"
    assert updated_fetched.last_synced_at is not None

    deleted = await workspace_repo.delete("ws-old")
    deleted_missing = await workspace_repo.delete("ws-old")
    assert deleted is True
    assert deleted_missing is False


async def test_generation_run_repository_create_find_and_update(db: Database) -> None:
    user_repo = SQLiteUserRepository(db)
    workspace_repo = SQLiteWorkspaceRepository(db)
    run_repo = SQLiteGenerationRunRepository(db)

    await user_repo.create(
        User(
            id="run-owner",
            github_id="gh-run-owner",
            github_username="runowner",
            email="run@test.com",
            display_name="Run Owner",
        )
    )
    await workspace_repo.create(
        Workspace(
            id="run-ws",
            owner_id="run-owner",
            name="Run WS",
        )
    )

    run_old = GenerationRun(
        id="run-old",
        workspace_id="run-ws",
        status=GenerationStatus.PENDING,
        generator="terraform",
        created_at=datetime.now(timezone.utc) - timedelta(minutes=2),
    )
    run_new = GenerationRun(
        id="run-new",
        workspace_id="run-ws",
        status=GenerationStatus.RUNNING,
        generator="terraform",
        created_at=datetime.now(timezone.utc) - timedelta(minutes=1),
    )

    await run_repo.create(run_old)
    await run_repo.create(run_new)

    found = await run_repo.find_by_id("run-old")
    missing = await run_repo.find_by_id("missing-run")
    by_workspace = await run_repo.find_by_workspace("run-ws")

    assert found is not None and found.id == "run-old"
    assert missing is None
    assert [item.id for item in by_workspace] == ["run-new", "run-old"]

    run_old.status = GenerationStatus.COMPLETED
    run_old.commit_sha = "abc123"
    run_old.pull_request_url = "https://github.com/org/repo/pull/1"
    run_old.error_message = None
    run_old.started_at = datetime.now(timezone.utc) - timedelta(minutes=5)
    run_old.completed_at = datetime.now(timezone.utc)

    updated = await run_repo.update(run_old)
    refetched = await run_repo.find_by_id("run-old")

    assert updated.status == GenerationStatus.COMPLETED
    assert refetched is not None
    assert refetched.status == GenerationStatus.COMPLETED
    assert refetched.commit_sha == "abc123"
    assert refetched.pull_request_url == "https://github.com/org/repo/pull/1"
    assert refetched.started_at is not None
    assert refetched.completed_at is not None


async def test_session_repository_create_get_revoke_and_cleanup(db: Database) -> None:
    user_repo = SQLiteUserRepository(db)
    session_repo = SQLiteSessionRepository(db)

    await user_repo.create(
        User(
            id="session-user",
            github_id="gh-session-user",
            github_username="session-user",
            email="session@test.com",
            display_name="Session User",
        )
    )

    session = Session(
        id="session-1",
        user_id="session-user",
        created_at=100,
        expires_at=2_000_000_000,
    )
    await session_repo.create(session)

    fetched = await session_repo.get_by_id("session-1")
    assert fetched is not None
    assert fetched.id == "session-1"
    assert fetched.user_id == "session-user"

    await session_repo.update_last_seen("session-1", 12345)
    seen = await session_repo.get_by_id("session-1")
    assert seen is not None
    assert seen.last_seen_at == 12345

    await session_repo.update_workspace("session-1", "ws-1", "acme/repo")
    scoped = await session_repo.get_by_id("session-1")
    assert scoped is not None
    assert scoped.current_workspace_id == "ws-1"
    assert scoped.current_repo_full_name == "acme/repo"

    await session_repo.revoke("session-1")
    revoked = await session_repo.get_by_id("session-1")
    assert revoked is not None
    assert revoked.revoked_at is not None

    await session_repo.create(
        Session(
            id="session-2",
            user_id="session-user",
            created_at=200,
            expires_at=2_000_000_000,
        )
    )
    await session_repo.create(
        Session(
            id="session-3",
            user_id="session-user",
            created_at=300,
            expires_at=2_000_000_000,
        )
    )
    await session_repo.revoke_all_for_user("session-user")

    revoked_second = await session_repo.get_by_id("session-2")
    revoked_third = await session_repo.get_by_id("session-3")
    assert revoked_second is not None and revoked_second.revoked_at is not None
    assert revoked_third is not None and revoked_third.revoked_at is not None

    await session_repo.create(
        Session(
            id="session-expired",
            user_id="session-user",
            created_at=1,
            expires_at=1,
        )
    )
    deleted_count = await session_repo.cleanup_expired()
    assert deleted_count >= 1
    assert await session_repo.get_by_id("session-expired") is None

    assert await session_repo.get_by_id("session-missing") is None
