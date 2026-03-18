from __future__ import annotations

import importlib
from typing import Protocol, cast


class RedisAsyncClientProtocol(Protocol):
    async def ping(self) -> object: ...

    async def aclose(self) -> None: ...

    async def get(self, key: str) -> str | bytes | None: ...

    async def set(self, key: str, value: str, ex: int | None = None) -> object: ...

    async def delete(self, *keys: str) -> int: ...

    async def sadd(self, key: str, *values: str) -> int: ...

    async def srem(self, key: str, *values: str) -> int: ...

    async def smembers(self, key: str) -> set[str | bytes]: ...

    async def scan(
        self,
        cursor: int | str = 0,
        match: str | None = None,
        count: int | None = None,
    ) -> tuple[int | str, list[str | bytes]]: ...


class RedisClient:
    def __init__(self, url: str) -> None:
        self._url: str = url
        self._client: RedisAsyncClientProtocol | None = None

    async def connect(self) -> None:
        if self._client is not None:
            return

        redis_async = importlib.import_module("redis.asyncio")
        client = cast(
            RedisAsyncClientProtocol,
            redis_async.from_url(self._url, decode_responses=True),
        )
        await client.ping()
        self._client = client

    async def disconnect(self) -> None:
        if self._client is None:
            return
        await self._client.aclose()
        self._client = None

    @property
    def client(self) -> RedisAsyncClientProtocol:
        if self._client is None:
            raise RuntimeError("Redis client not connected. Call connect() first.")
        return self._client


def create_redis_client(url: str) -> RedisClient:
    return RedisClient(url)
