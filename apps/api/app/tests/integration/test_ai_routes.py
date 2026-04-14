from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import cast

import pytest
from httpx import AsyncClient

from app.core.dependencies import get_key_manager
from app.core.security import generate_id
from app.tests.helpers import with_cookies
from app.domain.models.ai_entities import AIApiKey, CostEstimate, CostResource
from app.domain.models.entities import User
from app.infrastructure.cost.infracost_client import InfracostClient
from app.infrastructure.db.connection import Database
from app.infrastructure.db.repositories import SQLiteAIApiKeyRepository
from app.infrastructure.llm.client import LLMError, OpenAIClient
from app.infrastructure.llm.key_manager import KeyManager


async def _store_openai_key(db: Database, user_id: str) -> None:
    key_manager = cast(KeyManager, get_key_manager())
    encrypted_key = key_manager.encrypt("sk-test-openai")
    api_key = AIApiKey(
        id=generate_id(),
        user_id=user_id,
        provider="openai",
        encrypted_key=encrypted_key,
        created_at=datetime.now(timezone.utc),
    )
    _ = await SQLiteAIApiKeyRepository(db).upsert(api_key)


@pytest.mark.asyncio
async def test_generate_success(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    test_user: User,
    db: Database,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _store_openai_key(db, test_user.id)

    architecture: dict[str, object] = {
        "plates": [],
        "blocks": [],
        "connections": [],
        "externalActors": [],
    }

    async def mock_generate(
        self: OpenAIClient,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, object] | None = None,
    ) -> dict[str, object]:
        _ = self
        _ = response_schema
        assert "Complexity target" in system_prompt
        assert user_prompt == "build architecture"
        return architecture

    monkeypatch.setattr(OpenAIClient, "generate", mock_generate)

    response = await with_cookies(client, auth_cookies).post("/api/v1/ai/generate", json={"prompt": "build architecture", "provider": "aws", "complexity": "simple"},)

    assert response.status_code == 200
    payload = cast(dict[str, object], json.loads(response.text))
    assert payload["architecture"] == architecture
    assert payload["warnings"] == []


@pytest.mark.asyncio
async def test_generate_no_auth(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/ai/generate",
        json={"prompt": "build architecture", "provider": "aws", "complexity": "simple"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_generate_no_api_key(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    response = await with_cookies(client, auth_cookies).post("/api/v1/ai/generate", json={"prompt": "build architecture", "provider": "aws", "complexity": "simple"},)

    assert response.status_code == 400
    payload = cast(dict[str, object], json.loads(response.text))
    error_payload = cast(dict[str, object], payload["error"])
    assert error_payload["message"] == (
        "No OpenAI API key stored. Please add one via /api/v1/ai/keys"
    )


@pytest.mark.asyncio
async def test_generate_returns_validation_warnings(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    test_user: User,
    db: Database,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _store_openai_key(db, test_user.id)

    invalid_architecture: dict[str, object] = {
        "plates": [
            {
                "id": "cb-1",
                "name": "VPC",
                "type": "datacenter",
                "parentId": None,
                "children": [],
                "position": {"x": 0, "y": 0, "z": 0},
                "size": {"width": 20, "height": 1, "depth": 15},
            }
        ],
        "blocks": [
            {
                "id": "block-1",
                "name": "Server",
                "category": "networking",
                "placementId": "cb-1",
                "position": {"x": 2, "y": 0, "z": 2},
                "provider": "aws",
                "subtype": "ec2",
            }
        ],
        "connections": [],
        "externalActors": [],
    }

    async def mock_generate(
        self: OpenAIClient,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, object] | None = None,
    ) -> dict[str, object]:
        _ = self
        _ = system_prompt
        _ = user_prompt
        _ = response_schema
        return invalid_architecture

    monkeypatch.setattr(OpenAIClient, "generate", mock_generate)

    response = await with_cookies(client, auth_cookies).post("/api/v1/ai/generate", json={"prompt": "build it", "provider": "aws", "complexity": "simple"},)

    assert response.status_code == 200
    payload = cast(dict[str, object], json.loads(response.text))
    warnings = cast(list[object], payload["warnings"])
    assert isinstance(warnings, list)
    assert len(warnings) >= 2


@pytest.mark.asyncio
async def test_suggest_success(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    test_user: User,
    db: Database,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _store_openai_key(db, test_user.id)

    suggestion_response: dict[str, object] = {
        "suggestions": [
            {
                "category": "security",
                "severity": "critical",
                "message": "S3 bucket is publicly accessible",
                "action_description": "Enable block public access on the S3 bucket",
            },
        ],
        "score": {"security": 60, "reliability": 80, "best_practice": 70},
    }

    async def mock_generate(
        self: OpenAIClient,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, object] | None = None,
    ) -> dict[str, object]:
        _ = self
        _ = system_prompt
        _ = response_schema
        assert "aws" in user_prompt.lower()
        return suggestion_response

    monkeypatch.setattr(OpenAIClient, "generate", mock_generate)

    response = await with_cookies(client, auth_cookies).post("/api/v1/ai/suggest", json={"architecture": {"plates": [], "blocks": []}, "provider": "aws"},)

    assert response.status_code == 200
    payload = cast(dict[str, object], json.loads(response.text))
    suggestions = cast(list[object], payload["suggestions"])
    assert isinstance(suggestions, list)
    assert len(suggestions) == 1
    assert payload["status"] == "success"
    assert payload["score"] == {"security": 60, "reliability": 80, "best_practice": 70}


@pytest.mark.asyncio
async def test_suggest_llm_error(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    test_user: User,
    db: Database,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _store_openai_key(db, test_user.id)

    async def mock_generate(
        self: OpenAIClient,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, object] | None = None,
    ) -> dict[str, object]:
        _ = self
        _ = system_prompt
        _ = user_prompt
        _ = response_schema
        raise LLMError("model overloaded")

    monkeypatch.setattr(OpenAIClient, "generate", mock_generate)

    response = await with_cookies(client, auth_cookies).post("/api/v1/ai/suggest", json={"architecture": {"blocks": []}, "provider": "aws"},)

    assert response.status_code == 500
    payload = cast(dict[str, object], response.json())
    error_payload = cast(dict[str, object], payload["error"])
    assert error_payload["code"] == "GENERATION_FAILED"
    assert "Architecture analysis failed" in str(error_payload["message"])


@pytest.mark.asyncio
async def test_suggest_no_api_key(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    response = await with_cookies(client, auth_cookies).post("/api/v1/ai/suggest", json={"architecture": {}, "provider": "aws"},)

    assert response.status_code == 400
    payload = cast(dict[str, object], json.loads(response.text))
    error_payload = cast(dict[str, object], payload["error"])
    assert error_payload["message"] == (
        "No OpenAI API key stored. Please add one via /api/v1/ai/keys"
    )


@pytest.mark.asyncio
async def test_suggest_no_auth(client: AsyncClient) -> None:
    response = await client.post("/api/v1/ai/suggest", json={"architecture": {}})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_cost_success(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    cost_result = CostEstimate(
        monthly_cost=42.50,
        hourly_cost=42.50 / 730,
        currency="USD",
        resources=[
            CostResource(
                name="Web ALB",
                monthly_cost=22.50,
                details={"resourceType": "aws_lb"},
            ),
            CostResource(
                name="App DB",
                monthly_cost=20.00,
                details={"resourceType": "aws_db_instance"},
            ),
        ],
    )

    async def mock_estimate(
        self: InfracostClient,
        terraform_dir: str,
    ) -> CostEstimate:
        _ = self
        assert Path(terraform_dir).exists()
        return cost_result

    monkeypatch.setattr(InfracostClient, "estimate", mock_estimate)

    architecture: dict[str, object] = {
        "blocks": [
            {
                "id": "block-1",
                "name": "Web ALB",
                "category": "gateway",
                "placementId": "cb-1",
                "position": {"x": 2, "y": 0, "z": 2},
                "provider": "aws",
                "subtype": "alb",
            },
            {
                "id": "block-2",
                "name": "App DB",
                "category": "database",
                "placementId": "cb-1",
                "position": {"x": 6, "y": 0, "z": 2},
                "provider": "aws",
                "subtype": "rds-postgres",
            },
        ],
    }

    response = await with_cookies(client, auth_cookies).post("/api/v1/ai/cost", json={"architecture": architecture, "provider": "aws"},)

    assert response.status_code == 200
    payload = cast(dict[str, object], json.loads(response.text))
    assert payload["monthly_cost"] == 42.50
    assert payload["currency"] == "USD"
    resources = cast(list[object], payload["resources"])
    assert isinstance(resources, list)
    assert len(resources) == 2


@pytest.mark.asyncio
async def test_cost_success_with_nodes_format(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    cost_result = CostEstimate(
        monthly_cost=10.0,
        hourly_cost=10.0 / 730,
        currency="USD",
        resources=[],
    )

    async def mock_estimate(
        self: InfracostClient,
        terraform_dir: str,
    ) -> CostEstimate:
        _ = self
        assert Path(terraform_dir).exists()
        return cost_result

    monkeypatch.setattr(InfracostClient, "estimate", mock_estimate)

    architecture: dict[str, object] = {
        "nodes": [
            {
                "id": "cb-1",
                "kind": "container",
                "type": "region",
            },
            {
                "id": "block-1",
                "kind": "resource",
                "name": "Web ALB",
                "category": "gateway",
                "parentId": "cb-1",
                "provider": "aws",
                "subtype": "alb",
            },
        ]
    }

    response = await with_cookies(client, auth_cookies).post("/api/v1/ai/cost", json={"architecture": architecture, "provider": "aws"},)

    assert response.status_code == 200
    payload = cast(dict[str, object], json.loads(response.text))
    assert payload["monthly_cost"] == 10.0


@pytest.mark.asyncio
async def test_cost_no_auth(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/ai/cost",
        json={"architecture": {"blocks": []}, "provider": "aws"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_cost_infracost_error(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.infrastructure.cost.infracost_client import InfracostError

    async def mock_estimate(
        self: InfracostClient,
        terraform_dir: str,
    ) -> CostEstimate:
        _ = self
        _ = terraform_dir
        raise InfracostError("Infracost binary not found on PATH")

    monkeypatch.setattr(InfracostClient, "estimate", mock_estimate)

    response = await with_cookies(client, auth_cookies).post("/api/v1/ai/cost", json={"architecture": {"blocks": []}, "provider": "aws"},)

    assert response.status_code == 500
    payload = cast(dict[str, object], json.loads(response.text))
    error_payload = cast(dict[str, object], payload["error"])
    assert error_payload["code"] == "GENERATION_FAILED"
