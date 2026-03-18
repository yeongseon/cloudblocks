from __future__ import annotations

import json
import time
from collections.abc import Callable

from app.domain.models.entities import Session
from app.domain.models.repositories import SessionRepository
from app.infrastructure.cache.redis_client import RedisClient


class RedisSessionRepository(SessionRepository):
    def __init__(
        self,
        redis_client: RedisClient,
        sliding_ttl_days: int = 14,
        absolute_ttl_days: int = 30,
        now_fn: Callable[[], int] | None = None,
    ) -> None:
        self._redis_client = redis_client
        self._sliding_ttl_seconds = sliding_ttl_days * 24 * 3600
        self._absolute_ttl_seconds = absolute_ttl_days * 24 * 3600
        self._now_fn = now_fn or (lambda: int(time.time()))

    @property
    def _redis(self):
        return self._redis_client.client

    def _now(self) -> int:
        return self._now_fn()

    @staticmethod
    def _session_key(session_id: str) -> str:
        return f"cb:sess:{session_id}"

    @staticmethod
    def _user_session_index_key(user_id: str) -> str:
        return f"cb:user_sess:{user_id}"

    @staticmethod
    def _decode(value: str | bytes) -> str:
        if isinstance(value, bytes):
            return value.decode("utf-8")
        return value

    def _effective_expiry(self, created_at: int, now: int) -> int:
        absolute_deadline = created_at + self._absolute_ttl_seconds
        sliding_deadline = now + self._sliding_ttl_seconds
        return min(absolute_deadline, sliding_deadline)

    def _ttl_seconds(self, created_at: int, now: int) -> int:
        return self._effective_expiry(created_at, now) - now

    @staticmethod
    def _serialize(session: Session) -> str:
        return json.dumps(session.model_dump())

    @staticmethod
    def _deserialize(payload: str | bytes) -> Session:
        return Session.model_validate(json.loads(RedisSessionRepository._decode(payload)))

    async def _read_session(self, session_id: str) -> Session | None:
        payload = await self._redis.get(self._session_key(session_id))
        if payload is None:
            return None
        return self._deserialize(payload)

    async def create(self, session: Session) -> Session:
        now = self._now()
        ttl_seconds = self._ttl_seconds(session.created_at, now)
        if ttl_seconds <= 0:
            return session

        session.expires_at = self._effective_expiry(session.created_at, now)
        await self._redis.set(
            self._session_key(session.id),
            self._serialize(session),
            ex=ttl_seconds,
        )
        await self._redis.sadd(self._user_session_index_key(session.user_id), session.id)
        return session

    async def get_by_id(self, session_id: str) -> Session | None:
        session = await self._read_session(session_id)
        if session is None:
            return None

        now = self._now()
        if session.expires_at < now or session.revoked_at is not None:
            return None
        return session

    async def revoke(self, session_id: str) -> None:
        session = await self._read_session(session_id)
        if session is None:
            return

        now = self._now()
        if session.revoked_at is None:
            session.revoked_at = now

        ttl_seconds = self._ttl_seconds(session.created_at, now)
        if ttl_seconds <= 0:
            await self._redis.delete(self._session_key(session_id))
        else:
            await self._redis.set(
                self._session_key(session_id),
                self._serialize(session),
                ex=ttl_seconds,
            )
        await self._redis.srem(self._user_session_index_key(session.user_id), session.id)

    async def update_last_seen(self, session_id: str, timestamp: int) -> None:
        session = await self._read_session(session_id)
        if session is None:
            return

        session.last_seen_at = timestamp
        session.expires_at = self._effective_expiry(session.created_at, timestamp)

        now = self._now()
        ttl_seconds = session.expires_at - now
        if ttl_seconds <= 0:
            await self._redis.delete(self._session_key(session_id))
            await self._redis.srem(self._user_session_index_key(session.user_id), session.id)
            return

        await self._redis.set(
            self._session_key(session.id),
            self._serialize(session),
            ex=ttl_seconds,
        )

    async def revoke_all_for_user(self, user_id: str) -> None:
        user_index_key = self._user_session_index_key(user_id)
        session_ids = await self._redis.smembers(user_index_key)
        for session_id in session_ids:
            await self.revoke(self._decode(session_id))
        await self._redis.delete(user_index_key)

    async def update_workspace(
        self,
        session_id: str,
        workspace_id: str,
        repo_full_name: str | None,
    ) -> None:
        session = await self._read_session(session_id)
        if session is None:
            return

        session.current_workspace_id = workspace_id
        session.current_repo_full_name = repo_full_name

        now = self._now()
        ttl_seconds = self._ttl_seconds(session.created_at, now)
        if ttl_seconds <= 0:
            await self._redis.delete(self._session_key(session_id))
            await self._redis.srem(self._user_session_index_key(session.user_id), session.id)
            return

        await self._redis.set(
            self._session_key(session.id),
            self._serialize(session),
            ex=ttl_seconds,
        )

    async def cleanup_expired(self) -> int:
        deleted = 0
        cursor: int | str = 0
        now = self._now()

        while True:
            cursor, keys = await self._redis.scan(cursor=cursor, match="cb:sess:*")
            for raw_key in keys:
                key = self._decode(raw_key)
                payload = await self._redis.get(key)
                if payload is None:
                    continue

                remove_key = False
                user_id: str | None = None
                session_id: str | None = None

                try:
                    session = self._deserialize(payload)
                    user_id = session.user_id
                    session_id = session.id
                    if session.expires_at < now or session.revoked_at is not None:
                        remove_key = True
                except (json.JSONDecodeError, ValueError):
                    remove_key = True

                if remove_key:
                    result = await self._redis.delete(key)
                    if result:
                        deleted += int(result)
                    if user_id is not None and session_id is not None:
                        await self._redis.srem(self._user_session_index_key(user_id), session_id)

            if str(cursor) == "0":
                break

        return deleted
