from __future__ import annotations

from typing import cast
from unittest.mock import AsyncMock

import pytest

from app.domain.models.ai_entities import AISuggestionsResponse
from app.engines.suggestions import SuggestionEngine
from app.infrastructure.llm.client import LLMClient, LLMError

MOCK_RESPONSE: dict[str, object] = {
    "suggestions": [
        {
            "category": "security",
            "severity": "critical",
            "message": "Database is in public subnet",
            "action_description": "Move database to private subnet",
        },
        {
            "category": "reliability",
            "severity": "warning",
            "message": "Single AZ deployment",
            "action_description": "Deploy across multiple availability zones",
        },
    ],
    "score": {"security": 40, "reliability": 60, "best_practice": 75},
}


def _mock_llm_client() -> tuple[LLMClient, AsyncMock]:
    raw_client = AsyncMock(spec=LLMClient)
    client = cast(LLMClient, raw_client)
    generate = cast(AsyncMock, raw_client.generate)
    return client, generate


@pytest.mark.asyncio
async def test_analyze_returns_suggestions() -> None:
    llm_client, generate = _mock_llm_client()
    generate.return_value = MOCK_RESPONSE
    engine = SuggestionEngine(llm_client)

    result = await engine.analyze(
        architecture={"blocks": [{"id": "db-1", "category": "database"}]},
    )

    assert isinstance(result, AISuggestionsResponse)
    assert len(result.suggestions) == 2
    assert result.suggestions[0].category == "security"
    assert result.suggestions[0].severity == "critical"
    assert result.score["security"] == 40


@pytest.mark.asyncio
async def test_analyze_empty_architecture() -> None:
    llm_client, generate = _mock_llm_client()
    generate.return_value = MOCK_RESPONSE
    engine = SuggestionEngine(llm_client)

    result = await engine.analyze(architecture={})

    assert isinstance(result, AISuggestionsResponse)
    assert len(result.suggestions) == 2


@pytest.mark.asyncio
async def test_analyze_malformed_llm_response() -> None:
    llm_client, generate = _mock_llm_client()
    generate.return_value = {
        "suggestions": "bad-shape",
        "score": "invalid",
    }
    engine = SuggestionEngine(llm_client)

    result = await engine.analyze(architecture={"plates": []})

    assert result.suggestions == []
    assert result.score == {}


@pytest.mark.asyncio
async def test_analyze_llm_error() -> None:
    llm_client, generate = _mock_llm_client()
    generate.side_effect = LLMError("provider unavailable")
    engine = SuggestionEngine(llm_client)

    result = await engine.analyze(architecture={"blocks": []})

    assert result.suggestions == []
    assert result.score == {}


@pytest.mark.asyncio
async def test_analyze_score_values() -> None:
    llm_client, generate = _mock_llm_client()
    generate.return_value = MOCK_RESPONSE
    engine = SuggestionEngine(llm_client)

    result = await engine.analyze(architecture={"connections": []})

    assert "security" in result.score
    assert "reliability" in result.score
    assert "best_practice" in result.score


@pytest.mark.asyncio
async def test_suggestions_have_required_fields() -> None:
    llm_client, generate = _mock_llm_client()
    generate.return_value = MOCK_RESPONSE
    engine = SuggestionEngine(llm_client)

    result = await engine.analyze(architecture={"externalActors": []})

    for suggestion in result.suggestions:
        assert suggestion.category
        assert suggestion.severity
        assert suggestion.message
