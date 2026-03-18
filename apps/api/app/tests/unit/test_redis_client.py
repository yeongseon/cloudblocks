from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.infrastructure.cache.redis_client import RedisClient, create_redis_client


@pytest.mark.asyncio
async def test_connect_creates_client_and_pings() -> None:
    mock_redis = AsyncMock()
    mock_redis.ping = AsyncMock(return_value=True)
    redis_async_module = SimpleNamespace(from_url=MagicMock(return_value=mock_redis))

    with patch(
        "app.infrastructure.cache.redis_client.importlib.import_module",
        return_value=redis_async_module,
    ) as import_module:
        client = RedisClient("redis://localhost:6379/0")
        await client.connect()
        await client.connect()

    import_module.assert_called_once_with("redis.asyncio")
    redis_async_module.from_url.assert_called_once_with(
        "redis://localhost:6379/0",
        decode_responses=True,
    )
    mock_redis.ping.assert_awaited_once()
    assert client.client is mock_redis


@pytest.mark.asyncio
async def test_disconnect_closes_pool_and_clears_client() -> None:
    mock_redis = AsyncMock()
    mock_redis.ping = AsyncMock(return_value=True)
    mock_redis.aclose = AsyncMock(return_value=None)
    redis_async_module = SimpleNamespace(from_url=MagicMock(return_value=mock_redis))

    with patch(
        "app.infrastructure.cache.redis_client.importlib.import_module",
        return_value=redis_async_module,
    ):
        client = RedisClient("redis://localhost:6379/0")
        await client.connect()

    await client.disconnect()
    mock_redis.aclose.assert_awaited_once()

    with pytest.raises(RuntimeError, match="Redis client not connected"):
        _ = client.client


@pytest.mark.asyncio
async def test_disconnect_is_noop_when_not_connected() -> None:
    client = RedisClient("redis://localhost:6379/0")
    await client.disconnect()


def test_create_redis_client_factory() -> None:
    client = create_redis_client("redis://localhost:6379/0")
    assert isinstance(client, RedisClient)
