from __future__ import annotations

import json
from unittest.mock import AsyncMock

import pytest

from app.domain.models.entities import Session
from app.infrastructure.cache.redis_client import RedisClient
from app.infrastructure.cache.redis_session_repo import RedisSessionRepository

SECONDS_PER_DAY = 24 * 3600


def make_session(
    *,
    session_id: str = "sess-1",
    user_id: str = "user-1",
    created_at: int = 1_700_000_000,
    expires_at: int = 1_700_100_000,
    revoked_at: int | None = None,
    last_seen_at: int | None = None,
    current_workspace_id: str | None = None,
    current_repo_full_name: str | None = None,
) -> Session:
    return Session(
        id=session_id,
        user_id=user_id,
        created_at=created_at,
        expires_at=expires_at,
        revoked_at=revoked_at,
        last_seen_at=last_seen_at,
        current_workspace_id=current_workspace_id,
        current_repo_full_name=current_repo_full_name,
    )


def build_repo(redis_mock: AsyncMock, now: int) -> RedisSessionRepository:
    client = RedisClient("redis://localhost:6379/0")
    client._client = redis_mock
    return RedisSessionRepository(
        client,
        sliding_ttl_days=14,
        absolute_ttl_days=30,
        now_fn=lambda: now,
    )


@pytest.mark.asyncio
async def test_create_stores_session_and_user_index() -> None:
    now = 1_710_000_000
    redis_mock = AsyncMock()
    redis_mock.set = AsyncMock(return_value=True)
    redis_mock.sadd = AsyncMock(return_value=1)
    repo = build_repo(redis_mock, now)

    session = make_session(created_at=now - 100)
    created = await repo.create(session)

    expected_ttl = 14 * SECONDS_PER_DAY
    set_args = redis_mock.set.await_args
    assert set_args.args[0] == "cb:sess:sess-1"
    assert set_args.kwargs["ex"] == expected_ttl
    stored_payload = json.loads(set_args.args[1])
    assert stored_payload["expires_at"] == now + expected_ttl
    redis_mock.sadd.assert_awaited_once_with("cb:user_sess:user-1", "sess-1")
    assert created.expires_at == now + expected_ttl


@pytest.mark.asyncio
async def test_create_enforces_absolute_cap_for_ttl() -> None:
    now = 1_710_000_000
    redis_mock = AsyncMock()
    redis_mock.set = AsyncMock(return_value=True)
    redis_mock.sadd = AsyncMock(return_value=1)
    repo = build_repo(redis_mock, now)

    created_at = now - (29 * SECONDS_PER_DAY)
    session = make_session(created_at=created_at)
    await repo.create(session)

    expected_ttl = SECONDS_PER_DAY
    set_args = redis_mock.set.await_args
    assert set_args.kwargs["ex"] == expected_ttl
    payload = json.loads(set_args.args[1])
    assert payload["expires_at"] == now + expected_ttl


@pytest.mark.asyncio
async def test_get_by_id_returns_none_for_missing() -> None:
    redis_mock = AsyncMock()
    redis_mock.get = AsyncMock(return_value=None)
    repo = build_repo(redis_mock, 1_710_000_000)

    assert await repo.get_by_id("missing") is None


@pytest.mark.asyncio
async def test_get_by_id_filters_revoked_and_expired() -> None:
    now = 1_710_000_000
    revoked = make_session(expires_at=now + 100, revoked_at=now - 1)
    expired = make_session(expires_at=now - 1, revoked_at=None)

    redis_mock_revoked = AsyncMock()
    redis_mock_revoked.get = AsyncMock(return_value=json.dumps(revoked.model_dump()))
    repo_revoked = build_repo(redis_mock_revoked, now)
    assert await repo_revoked.get_by_id(revoked.id) is None

    redis_mock_expired = AsyncMock()
    redis_mock_expired.get = AsyncMock(return_value=json.dumps(expired.model_dump()))
    repo_expired = build_repo(redis_mock_expired, now)
    assert await repo_expired.get_by_id(expired.id) is None


@pytest.mark.asyncio
async def test_revoke_marks_session_and_removes_from_user_index() -> None:
    now = 1_710_000_000
    session = make_session(created_at=now - 100)
    redis_mock = AsyncMock()
    redis_mock.get = AsyncMock(return_value=json.dumps(session.model_dump()))
    redis_mock.set = AsyncMock(return_value=True)
    redis_mock.srem = AsyncMock(return_value=1)
    repo = build_repo(redis_mock, now)

    await repo.revoke(session.id)

    set_args = redis_mock.set.await_args
    payload = json.loads(set_args.args[1])
    assert payload["revoked_at"] == now
    redis_mock.srem.assert_awaited_once_with("cb:user_sess:user-1", "sess-1")


@pytest.mark.asyncio
async def test_revoke_already_revoked_keeps_existing_timestamp() -> None:
    now = 1_710_000_000
    existing_revoked_at = now - 500
    session = make_session(created_at=now - 100, revoked_at=existing_revoked_at)
    redis_mock = AsyncMock()
    redis_mock.get = AsyncMock(return_value=json.dumps(session.model_dump()))
    redis_mock.set = AsyncMock(return_value=True)
    redis_mock.srem = AsyncMock(return_value=1)
    repo = build_repo(redis_mock, now)

    await repo.revoke(session.id)

    payload = json.loads(redis_mock.set.await_args.args[1])
    assert payload["revoked_at"] == existing_revoked_at


@pytest.mark.asyncio
async def test_update_last_seen_refreshes_sliding_ttl() -> None:
    now = 1_710_000_000
    session = make_session(created_at=now - 2 * SECONDS_PER_DAY)
    redis_mock = AsyncMock()
    redis_mock.get = AsyncMock(return_value=json.dumps(session.model_dump()))
    redis_mock.set = AsyncMock(return_value=True)
    repo = build_repo(redis_mock, now)

    await repo.update_last_seen(session.id, now)

    set_args = redis_mock.set.await_args
    assert set_args.kwargs["ex"] == 14 * SECONDS_PER_DAY
    payload = json.loads(set_args.args[1])
    assert payload["last_seen_at"] == now
    assert payload["expires_at"] == now + 14 * SECONDS_PER_DAY


@pytest.mark.asyncio
async def test_update_last_seen_respects_absolute_cap() -> None:
    now = 1_710_000_000
    session = make_session(created_at=now - (29 * SECONDS_PER_DAY))
    redis_mock = AsyncMock()
    redis_mock.get = AsyncMock(return_value=json.dumps(session.model_dump()))
    redis_mock.set = AsyncMock(return_value=True)
    repo = build_repo(redis_mock, now)

    await repo.update_last_seen(session.id, now)

    set_args = redis_mock.set.await_args
    assert set_args.kwargs["ex"] == SECONDS_PER_DAY
    payload = json.loads(set_args.args[1])
    assert payload["expires_at"] == now + SECONDS_PER_DAY


@pytest.mark.asyncio
async def test_revoke_all_for_user_revokes_all_and_deletes_index() -> None:
    redis_mock = AsyncMock()
    redis_mock.smembers = AsyncMock(return_value={b"sid-1", "sid-2"})
    redis_mock.delete = AsyncMock(return_value=1)
    repo = build_repo(redis_mock, 1_710_000_000)
    repo.revoke = AsyncMock(return_value=None)

    await repo.revoke_all_for_user("user-1")

    repo.revoke.assert_any_await("sid-1")
    repo.revoke.assert_any_await("sid-2")
    assert repo.revoke.await_count == 2
    redis_mock.delete.assert_awaited_once_with("cb:user_sess:user-1")


@pytest.mark.asyncio
async def test_update_workspace_updates_fields() -> None:
    now = 1_710_000_000
    session = make_session(created_at=now - 1_000)
    redis_mock = AsyncMock()
    redis_mock.get = AsyncMock(return_value=json.dumps(session.model_dump()))
    redis_mock.set = AsyncMock(return_value=True)
    repo = build_repo(redis_mock, now)

    await repo.update_workspace("sess-1", "ws-123", "org/repo")

    payload = json.loads(redis_mock.set.await_args.args[1])
    assert payload["current_workspace_id"] == "ws-123"
    assert payload["current_repo_full_name"] == "org/repo"


@pytest.mark.asyncio
async def test_cleanup_expired_deletes_revoked_and_expired_sessions() -> None:
    now = 1_710_000_000
    active = make_session(session_id="active", expires_at=now + 10_000)
    revoked = make_session(session_id="revoked", expires_at=now + 10_000, revoked_at=now - 1)
    expired = make_session(session_id="expired", expires_at=now - 1)

    payloads = {
        "cb:sess:active": json.dumps(active.model_dump()),
        "cb:sess:revoked": json.dumps(revoked.model_dump()),
        "cb:sess:expired": json.dumps(expired.model_dump()),
    }

    redis_mock = AsyncMock()
    redis_mock.scan = AsyncMock(return_value=("0", list(payloads.keys())))

    async def get_payload(key: str) -> str | None:
        return payloads.get(key)

    redis_mock.get = AsyncMock(side_effect=get_payload)
    redis_mock.delete = AsyncMock(return_value=1)
    redis_mock.srem = AsyncMock(return_value=1)
    repo = build_repo(redis_mock, now)

    deleted = await repo.cleanup_expired()

    assert deleted == 2
    redis_mock.delete.assert_any_await("cb:sess:revoked")
    redis_mock.delete.assert_any_await("cb:sess:expired")


@pytest.mark.asyncio
async def test_cleanup_expired_returns_zero_when_none_expired() -> None:
    now = 1_710_000_000
    active = make_session(expires_at=now + 10_000)
    redis_mock = AsyncMock()
    redis_mock.scan = AsyncMock(return_value=("0", ["cb:sess:active"]))
    redis_mock.get = AsyncMock(return_value=json.dumps(active.model_dump()))
    redis_mock.delete = AsyncMock(return_value=0)
    redis_mock.srem = AsyncMock(return_value=0)
    repo = build_repo(redis_mock, now)

    deleted = await repo.cleanup_expired()

    assert deleted == 0
    redis_mock.delete.assert_not_awaited()
