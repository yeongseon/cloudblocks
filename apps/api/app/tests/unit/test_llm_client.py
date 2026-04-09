from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.infrastructure.llm.client import LLMError, OpenAIClient


def _make_response(
    status_code: int,
    payload: dict[str, object] | None = None,
    text: str = "",
) -> MagicMock:
    response = MagicMock()
    response.status_code = status_code
    response.text = text
    response.json.return_value = payload if payload is not None else {}
    return response


def _make_async_client(post_side_effect: object) -> AsyncMock:
    client = AsyncMock()
    client.__aenter__.return_value = client
    client.__aexit__.return_value = False
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

    body = mock_client.post.await_args.kwargs["json"]
    assert body["response_format"] == {"type": "json_object"}
    system_text = body["messages"][0]["content"]
    assert "matching this schema exactly" in system_text
    assert '"required":["ok"]' in system_text


@pytest.mark.asyncio
async def test_retry_on_rate_limit() -> None:
    rate_limited = _make_response(429, text="rate limited")
    success = _make_response(200, {"choices": [{"message": {"content": '{"ok":true}'}}]})
    mock_client = _make_async_client([rate_limited, success])
    client = OpenAIClient(api_key="test-key")

    with (
        patch("app.infrastructure.llm.client.httpx.AsyncClient", return_value=mock_client),
        patch("app.infrastructure.llm.client.asyncio.sleep", new=AsyncMock()) as sleep_mock,
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

    with (
        patch("app.infrastructure.llm.client.httpx.AsyncClient", return_value=mock_client),
        patch("app.infrastructure.llm.client.asyncio.sleep", new=AsyncMock()) as sleep_mock,
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
