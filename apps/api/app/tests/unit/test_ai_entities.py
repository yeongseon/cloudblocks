from __future__ import annotations

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.domain.models.ai_entities import (
    AIApiKey,
    AIGenerationRequest,
    AIGenerationResponse,
    AISuggestion,
    AISuggestionsResponse,
    CostEstimate,
    CostResource,
)


def test_ai_generation_request_creation_defaults() -> None:
    request = AIGenerationRequest(prompt="Design a secure web app")

    assert request.prompt == "Design a secure web app"
    assert request.provider == "aws"
    assert request.complexity == "intermediate"


def test_ai_generation_request_creation_with_all_fields() -> None:
    request = AIGenerationRequest(
        prompt="Create a data pipeline",
        provider="gcp",
        complexity="advanced",
    )

    assert request.prompt == "Create a data pipeline"
    assert request.provider == "gcp"
    assert request.complexity == "advanced"


def test_ai_generation_request_requires_prompt() -> None:
    with pytest.raises(ValidationError):
        _ = AIGenerationRequest.model_validate({})


def test_ai_generation_response_creation_defaults() -> None:
    response = AIGenerationResponse(architecture={"nodes": [], "edges": []})

    assert response.architecture == {"nodes": [], "edges": []}
    assert response.explanation == ""
    assert response.warnings == []


def test_ai_generation_response_creation_with_all_fields() -> None:
    response = AIGenerationResponse(
        architecture={"plates": [{"id": "cb-1"}]},
        explanation="Generated baseline architecture",
        warnings=["Estimated cost may vary."],
    )

    assert response.architecture == {"plates": [{"id": "cb-1"}]}
    assert response.explanation == "Generated baseline architecture"
    assert response.warnings == ["Estimated cost may vary."]


def test_ai_generation_response_requires_architecture() -> None:
    with pytest.raises(ValidationError):
        _ = AIGenerationResponse.model_validate({})


def test_ai_suggestion_creation_defaults() -> None:
    suggestion = AISuggestion(
        category="security",
        severity="critical",
        message="Public S3 bucket detected",
    )

    assert suggestion.category == "security"
    assert suggestion.severity == "critical"
    assert suggestion.message == "Public S3 bucket detected"
    assert suggestion.action_description == ""


def test_ai_suggestion_creation_with_all_fields() -> None:
    suggestion = AISuggestion(
        category="best_practice",
        severity="info",
        message="Enable tagging for resources",
        action_description="Add standard environment and owner tags.",
    )

    assert suggestion.category == "best_practice"
    assert suggestion.severity == "info"
    assert suggestion.message == "Enable tagging for resources"
    assert suggestion.action_description == "Add standard environment and owner tags."


def test_ai_suggestion_requires_required_fields() -> None:
    with pytest.raises(ValidationError):
        _ = AISuggestion.model_validate({})


def test_ai_suggestions_response_creation_defaults() -> None:
    response = AISuggestionsResponse()

    assert response.suggestions == []
    assert response.score == {}


def test_ai_suggestions_response_creation_with_all_fields() -> None:
    suggestion = AISuggestion(
        category="reliability",
        severity="warning",
        message="Single-zone deployment",
    )
    response = AISuggestionsResponse(
        suggestions=[suggestion],
        score={"security": 7, "reliability": 5},
    )

    assert response.suggestions == [suggestion]
    assert response.score == {"security": 7, "reliability": 5}


def test_cost_resource_creation_defaults() -> None:
    resource = CostResource(name="EC2 t3.medium", monthly_cost=34.12)

    assert resource.name == "EC2 t3.medium"
    assert resource.monthly_cost == 34.12
    assert resource.details == {}


def test_cost_resource_creation_with_all_fields() -> None:
    resource = CostResource(
        name="RDS db.t3.micro",
        monthly_cost=15.5,
        details={"region": "us-east-1", "storage_gb": 20},
    )

    assert resource.name == "RDS db.t3.micro"
    assert resource.monthly_cost == 15.5
    assert resource.details == {"region": "us-east-1", "storage_gb": 20}


def test_cost_resource_requires_required_fields() -> None:
    with pytest.raises(ValidationError):
        _ = CostResource.model_validate({})


def test_cost_estimate_creation_defaults() -> None:
    estimate = CostEstimate(monthly_cost=100.0, hourly_cost=0.14)

    assert estimate.monthly_cost == 100.0
    assert estimate.hourly_cost == 0.14
    assert estimate.currency == "USD"
    assert estimate.resources == []


def test_cost_estimate_creation_with_all_fields() -> None:
    resource = CostResource(name="Cloud Run", monthly_cost=22.0)
    estimate = CostEstimate(
        monthly_cost=150.75,
        hourly_cost=0.21,
        currency="USD",
        resources=[resource],
    )

    assert estimate.monthly_cost == 150.75
    assert estimate.hourly_cost == 0.21
    assert estimate.currency == "USD"
    assert estimate.resources == [resource]


def test_cost_estimate_requires_required_fields() -> None:
    with pytest.raises(ValidationError):
        _ = CostEstimate.model_validate({})


def test_ai_api_key_creation_defaults_timestamp() -> None:
    api_key = AIApiKey(
        id="key-1",
        user_id="user-1",
        provider="openai",
        encrypted_key="encrypted-value",
    )

    assert api_key.id == "key-1"
    assert api_key.user_id == "user-1"
    assert api_key.provider == "openai"
    assert api_key.encrypted_key == "encrypted-value"
    assert isinstance(api_key.created_at, datetime)
    assert api_key.created_at.tzinfo is timezone.utc


def test_ai_api_key_creation_with_all_fields() -> None:
    created_at = datetime(2025, 1, 1, tzinfo=timezone.utc)

    api_key = AIApiKey(
        id="key-2",
        user_id="user-2",
        provider="openai",
        encrypted_key="encrypted-value-2",
        created_at=created_at,
    )

    assert api_key.created_at == created_at


def test_ai_api_key_requires_required_fields() -> None:
    with pytest.raises(ValidationError):
        _ = AIApiKey.model_validate({})
