from __future__ import annotations

from collections.abc import Mapping

from httpx import AsyncClient


def with_cookies(client: AsyncClient, cookies: Mapping[str, str]) -> AsyncClient:
    client.cookies.clear()
    for name, value in cookies.items():
        client.cookies.set(name, value)
    return client
