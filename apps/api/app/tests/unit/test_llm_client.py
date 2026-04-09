from __future__ import annotations

from dataclasses import dataclass
from typing import cast, final
from unittest.mock import patch

import httpx
import pytest

from app.infrastructure.llm.client import LLMError, OpenAIClient


@dataclass
class _CallArgs:
    args: tuple[object, ...]
    kwargs: dict[str, object]


@final
class _MockResponse:
    status_code: int
    text: str
    _payload: dict[str, object]

    def __init__(self, status_code: int, payload: dict[str, object] | None = None, text: str = ""):
        self.status_code = status_code
        self.text = text
        self._payload = payload if payload is not None else {}

    def json(self) -> dict[str, object]:
        return self._payload


@final
class _AwaitableCall:
    await_count: int
    await_args: _CallArgs
    side_effect: list[object] | BaseException | None
    return_value: object | None

    def __init__(self) -> None:
        self.await_count = 0
        self.await_args = _CallArgs(args=(), kwargs={})
        self.side_effect = None
        self.return_value = None

    async def __call__(self, *args: object, **kwargs: object) -> object:
        self.await_count += 1
        self.await_args = _CallArgs(args=args, kwargs=kwargs)
        if isinstance(self.side_effect, BaseException):
            raise self.side_effect
        if isinstance(self.side_effect, list):
            if not self.side_effect:
                raise RuntimeError("side_effect list is empty")
            value = self.side_effect.pop(0)
            if isinstance(value, BaseException):
                raise value
            return value
        if self.side_effect is not None:
            return self.side_effect
        return self.return_value


@final
class _MockAsyncClient:
    post: _AwaitableCall

    def __init__(self) -> None:
        self.post = _AwaitableCall()

    async def __aenter__(self) -> _MockAsyncClient:
        return self

    async def __aexit__(self, exc_type: object, exc: object, tb: object) -> bool:
        return False


@final
class _SleepRecorder:
    await_count: int
    await_args: _CallArgs

    def __init__(self) -> None:
        self.await_count = 0
        self.await_args = _CallArgs(args=(), kwargs={})

    async def __call__(self, *args: object, **kwargs: object) -> None:
        self.await_count += 1
        self.await_args = _CallArgs(args=args, kwargs=kwargs)

    def assert_awaited_once_with(self, *args: object, **kwargs: object) -> None:
        assert self.await_count == 1
        assert self.await_args.args == args
        assert self.await_args.kwargs == kwargs


def _make_response(
    status_code: int,
    payload: dict[str, object] | None = None,
    text: str = "",
) -> _MockResponse:
    return _MockResponse(status_code, payload, text)


def _make_async_client(post_side_effect: object) -> _MockAsyncClient:
    client = _MockAsyncClient()
    if isinstance(post_side_effect, list | BaseException):
        client.post.side_effect = post_side_effect
    else:
        client.post.return_value = post_side_effect
    return client


@pytest.mark.asyncio
async def test_generate_success() -> None:
    response = _make_response(
        200,
        {
            "choices": [{"message": {"content": '{"result":"ok"}'}}],
            "usage": {"prompt_tokens": 5, "completion_tokens": 3, "total_tokens": 8},
        },
    )
    mock_client = _make_async_client(response)
    client = OpenAIClient(api_key="test-key")

    with patch("app.infrastructure.llm.client.httpx.AsyncClient", return_value=mock_client):
        result = await client.generate("system", "user")

    assert result == {"result": "ok"}
    assert client.token_usage == {"prompt_tokens": 5, "completion_tokens": 3, "total_tokens": 8}


@pytest.mark.asyncio
async def test_generate_with_schema() -> None:
    response = _make_response(200, {"choices": [{"message": {"content": '{"ok":true}'}}]})
    mock_client = _make_async_client(response)
    client = OpenAIClient(api_key="test-key")
    schema: dict[str, object] = {
        "type": "object",
        "properties": {"ok": {"type": "boolean"}},
        "required": ["ok"],
    }

    with patch("app.infrastructure.llm.client.httpx.AsyncClient", return_value=mock_client):
        _ = await client.generate("You are helpful.", "Generate JSON.", response_schema=schema)

    body = cast(dict[str, object], mock_client.post.await_args.kwargs["json"])
    assert body["response_format"] == {"type": "json_object"}
    messages = cast(list[dict[str, object]], body["messages"])
    system_text = cast(str, messages[0]["content"])
    assert "matching this schema exactly" in system_text
    assert '"required":["ok"]' in system_text


@pytest.mark.asyncio
async def test_retry_on_rate_limit() -> None:
    rate_limited = _make_response(429, text="rate limited")
    success = _make_response(200, {"choices": [{"message": {"content": '{"ok":true}'}}]})
    mock_client = _make_async_client([rate_limited, success])
    client = OpenAIClient(api_key="test-key")
    sleep_mock = _SleepRecorder()

    with (
        patch("app.infrastructure.llm.client.httpx.AsyncClient", return_value=mock_client),
        patch("app.infrastructure.llm.client.asyncio.sleep", new=sleep_mock),
    ):
        result = await client.generate("system", "user")

    assert result == {"ok": True}
    assert mock_client.post.await_count == 2
    sleep_mock.assert_awaited_once_with(1)


@pytest.mark.asyncio
async def test_retry_on_server_error() -> None:
    server_error = _make_response(500, text="server error")
    success = _make_response(200, {"choices": [{"message": {"content": '{"ok":true}'}}]})
    mock_client = _make_async_client([server_error, success])
    client = OpenAIClient(api_key="test-key")
    sleep_mock = _SleepRecorder()

    with (
        patch("app.infrastructure.llm.client.httpx.AsyncClient", return_value=mock_client),
        patch("app.infrastructure.llm.client.asyncio.sleep", new=sleep_mock),
    ):
        result = await client.generate("system", "user")

    assert result == {"ok": True}
    assert mock_client.post.await_count == 2
    sleep_mock.assert_awaited_once_with(1)


@pytest.mark.asyncio
async def test_timeout() -> None:
    mock_client = _make_async_client(httpx.TimeoutException("timed out"))
    client = OpenAIClient(api_key="test-key")

    with (
        patch("app.infrastructure.llm.client.httpx.AsyncClient", return_value=mock_client),
        pytest.raises(LLMError, match="timed out"),
    ):
        _ = await client.generate("system", "user")


@pytest.mark.asyncio
async def test_malformed_response() -> None:
    response = _make_response(200, {"choices": [{"message": {"content": "not-json"}}]})
    mock_client = _make_async_client(response)
    client = OpenAIClient(api_key="test-key")

    with (
        patch("app.infrastructure.llm.client.httpx.AsyncClient", return_value=mock_client),
        pytest.raises(LLMError, match="Malformed JSON"),
    ):
        _ = await client.generate("system", "user")


@pytest.mark.asyncio
async def test_api_error_response() -> None:
    response = _make_response(
        400,
        payload={"error": {"message": "invalid request"}},
        text="bad request",
    )
    mock_client = _make_async_client(response)
    client = OpenAIClient(api_key="test-key")

    with (
        patch("app.infrastructure.llm.client.httpx.AsyncClient", return_value=mock_client),
        pytest.raises(LLMError, match="400") as exc_info,
    ):
        _ = await client.generate("system", "user")

    assert "invalid request" in str(exc_info.value)
