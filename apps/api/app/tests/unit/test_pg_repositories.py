from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, cast

from app.domain.models.entities import (
    GenerationRun,
    GenerationStatus,
    Identity,
    Session,
    User,
    Workspace,
)
from app.infrastructure.db.connection import PostgresDatabase
from app.infrastructure.db.pg_repositories import (
    PgGenerationRunRepository,
    PgIdentityRepository,
    PgSessionRepository,
    PgUserRepository,
    PgWorkspaceRepository,
)


class FakePgDb:
    def __init__(self) -> None:
        self.execute_calls: list[tuple[str, tuple[object, ...]]] = []
        self.fetch_one_calls: list[tuple[str, tuple[object, ...]]] = []
        self.fetch_all_calls: list[tuple[str, tuple[object, ...]]] = []
        self.execute_results: list[str] = []
        self.fetch_one_results: list[dict[str, Any] | None] = []
        self.fetch_all_results: list[list[dict[str, Any]]] = []

    async def execute(self, query: str, params: tuple[object, ...] = ()) -> str:
        self.execute_calls.append((query, params))
        if self.execute_results:
            return self.execute_results.pop(0)
        return "UPDATE 1"

    async def fetch_one(
        self, query: str, params: tuple[object, ...] = ()
    ) -> dict[str, Any] | None:
        self.fetch_one_calls.append((query, params))
        if self.fetch_one_results:
            return self.fetch_one_results.pop(0)
        return None

    async def fetch_all(self, query: str, params: tuple[object, ...] = ()) -> list[dict[str, Any]]:
        self.fetch_all_calls.append((query, params))
        if self.fetch_all_results:
            return self.fetch_all_results.pop(0)
        return []


async def test_pg_user_repository_basic_queries_and_mapping() -> None:
    db = FakePgDb()
    repo = PgUserRepository(cast(PostgresDatabase, cast(object, db)))

    created_at = datetime(2026, 1, 1, 1, 2, 3, tzinfo=timezone.utc)
    db.fetch_one_results = [
        {
            "id": "u1",
            "github_id": "gh1",
            "github_username": "user1",
            "email": "u1@test.com",
            "display_name": "User One",
            "avatar_url": None,
            "created_at": created_at,
            "updated_at": created_at,
        },
        None,
    ]

    found = await repo.find_by_id("u1")
    missing = await repo.find_by_github_id("gh-missing")

    user = User(id="u2", github_id="gh2", github_username="user2")
    await repo.create(user)
    before_update = user.updated_at
    await repo.update(user)

    assert found is not None and found.id == "u1"
    assert missing is None
    assert "id = $1" in db.fetch_one_calls[0][0]
    assert "$8" in db.execute_calls[0][0]
    assert "$7" in db.execute_calls[1][0]
    assert user.updated_at >= before_update


async def test_pg_identity_repository_find_create_update_delete() -> None:
    db = FakePgDb()
    db.fetch_all_results = [
        [{"id": "i1", "user_id": "u1", "provider": "github", "provider_id": "gh1"}]
    ]
    db.fetch_one_results = [
        {"id": "i1", "user_id": "u1", "provider": "github", "provider_id": "gh1"},
        None,
    ]
    db.execute_results = ["INSERT 0 1", "UPDATE 1", "DELETE 3"]

    repo = PgIdentityRepository(cast(PostgresDatabase, cast(object, db)))
    by_user = await repo.find_by_user_id("u1")
    by_provider = await repo.find_by_provider("github", "gh1")
    missing = await repo.find_by_provider("github", "missing")

    identity = Identity(id="i2", user_id="u1", provider="github", provider_id="gh2")
    await repo.create(identity)
    await repo.update(identity)
    deleted = await repo.delete_by_user_id("u1")

    assert len(by_user) == 1
    assert by_provider is not None and by_provider.id == "i1"
    assert missing is None
    assert deleted == 3
    assert "provider = $1 AND provider_id = $2" in db.fetch_one_calls[0][0]
    assert "DELETE FROM identities WHERE user_id = $1" in db.execute_calls[2][0]


async def test_pg_workspace_repository_find_update_delete() -> None:
    db = FakePgDb()
    now = datetime.now(timezone.utc)
    db.fetch_one_results = [
        {
            "id": "w1",
            "owner_id": "u1",
            "name": "Workspace",
            "github_repo": "org/repo",
            "github_branch": "main",
            "generator": "terraform",
            "provider": "azure",
            "last_synced_at": now,
            "created_at": now,
            "updated_at": now,
        }
    ]
    db.fetch_all_results = [[{"id": "w1", "owner_id": "u1", "name": "Workspace"}]]
    db.execute_results = ["INSERT 0 1", "UPDATE 1", "DELETE 1"]

    repo = PgWorkspaceRepository(cast(PostgresDatabase, cast(object, db)))
    found = await repo.find_by_id("w1")
    by_owner = await repo.find_by_owner("u1")

    workspace = Workspace(id="w2", owner_id="u1", name="W2")
    await repo.create(workspace)
    await repo.update(workspace)
    deleted = await repo.delete("w2")

    assert found is not None and found.id == "w1"
    assert len(by_owner) == 1
    assert deleted is True
    assert "owner_id = $1" in db.fetch_all_calls[0][0]
    assert "DELETE FROM workspaces WHERE id = $1" in db.execute_calls[2][0]


async def test_pg_generation_run_repository_find_create_update() -> None:
    db = FakePgDb()
    now = datetime.now(timezone.utc)
    db.fetch_one_results = [
        {
            "id": "r1",
            "workspace_id": "w1",
            "status": "pending",
            "generator": "terraform",
            "created_at": now,
        }
    ]
    db.fetch_all_results = [
        [
            {
                "id": "r1",
                "workspace_id": "w1",
                "status": "pending",
                "generator": "terraform",
                "created_at": now,
            }
        ]
    ]

    repo = PgGenerationRunRepository(cast(PostgresDatabase, cast(object, db)))
    found = await repo.find_by_id("r1")
    by_workspace = await repo.find_by_workspace("w1")

    run = GenerationRun(
        id="r2",
        workspace_id="w1",
        status=GenerationStatus.RUNNING,
        generator="pulumi",
    )
    await repo.create(run)
    await repo.update(run)

    assert found is not None and found.status == GenerationStatus.PENDING
    assert len(by_workspace) == 1
    assert "$10" in db.execute_calls[0][0]
    assert "status = $1" in db.execute_calls[1][0]


async def test_pg_session_repository_crud_and_cleanup() -> None:
    db = FakePgDb()
    db.fetch_one_results = [
        {
            "id": "s1",
            "user_id": "u1",
            "created_at": 100,
            "expires_at": 200,
            "revoked_at": None,
            "last_seen_at": None,
            "current_workspace_id": None,
            "current_repo_full_name": None,
        }
    ]
    db.execute_results = ["INSERT 0 1", "UPDATE 1", "UPDATE 1", "UPDATE 1", "UPDATE 1", "DELETE 2"]

    repo = PgSessionRepository(cast(PostgresDatabase, cast(object, db)))
    session = Session(id="s1", user_id="u1", created_at=100, expires_at=200)

    await repo.create(session)
    fetched = await repo.get_by_id("s1")
    await repo.revoke("s1")
    await repo.revoke_all_for_user("u1")
    await repo.update_last_seen("s1", 123)
    await repo.update_workspace("s1", "w1", "org/repo")
    deleted = await repo.cleanup_expired()

    assert fetched is not None and fetched.id == "s1"
    assert deleted == 2
    assert "created_at, expires_at" in db.execute_calls[0][0]
    assert "revoked_at = $1" in db.execute_calls[1][0]
    assert "last_seen_at = $1" in db.execute_calls[3][0]
    assert "current_workspace_id = $1" in db.execute_calls[4][0]
