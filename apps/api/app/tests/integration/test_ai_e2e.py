"""End-to-end integration tests for the complete AI workflow.

Tests the full lifecycle: store API key → generate architecture → validate →
suggest improvements → estimate cost, with mock LLM responses covering all
three cloud providers and edge cases.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import cast

import pytest
from httpx import AsyncClient

from app.core.dependencies import get_key_manager
from app.core.security import generate_id
from app.domain.models.ai_entities import AIApiKey, CostEstimate, CostResource
from app.domain.models.entities import User
from app.infrastructure.cost.infracost_client import InfracostClient
from app.infrastructure.db.connection import Database
from app.infrastructure.db.repositories import SQLiteAIApiKeyRepository
from app.infrastructure.llm.client import LLMError, OpenAIClient
from app.infrastructure.llm.key_manager import KeyManager

VALID_THREE_TIER: dict[str, object] = {
    "plates": [
        {
            "id": "plate-1",
            "name": "Prod VPC",
            "type": "region",
            "parentId": None,
            "children": ["plate-2"],
            "position": {"x": 0, "y": 0, "z": 0},
            "size": {"width": 30, "height": 1, "depth": 20},
        },
        {
            "id": "plate-2",
            "name": "App Subnet",
            "type": "subnet",
            "subnetAccess": "private",
            "parentId": "plate-1",
            "children": ["block-1", "block-2", "block-3"],
            "position": {"x": 2, "y": 0, "z": 2},
            "size": {"width": 26, "height": 1, "depth": 16},
        },
    ],
    "blocks": [
        {
            "id": "block-1",
            "name": "Web ALB",
            "category": "gateway",
            "placementId": "plate-2",
            "position": {"x": 2, "y": 0, "z": 2},
            "provider": "aws",
            "subtype": "alb",
        },
        {
            "id": "block-2",
            "name": "App ECS",
            "category": "compute",
            "placementId": "plate-2",
            "position": {"x": 6, "y": 0, "z": 2},
            "provider": "aws",
            "subtype": "ecs",
        },
        {
            "id": "block-3",
            "name": "App DB",
            "category": "database",
            "placementId": "plate-2",
            "position": {"x": 10, "y": 0, "z": 2},
            "provider": "aws",
            "subtype": "rds-postgres",
        },
    ],
    "connections": [
        {"id": "conn-1", "sourceId": "block-1", "targetId": "block-2", "type": "http"},
        {"id": "conn-2", "sourceId": "block-2", "targetId": "block-3", "type": "data"},
    ],
    "externalActors": [
        {
            "id": "actor-1",
            "name": "Internet",
            "type": "internet",
            "position": {"x": -5, "y": 0, "z": 2},
        },
    ],
}

VALID_AZURE_ARCHITECTURE: dict[str, object] = {
    "plates": [
        {
            "id": "plate-az-1",
            "name": "Azure Region",
            "type": "region",
            "parentId": None,
            "children": ["plate-az-2"],
            "position": {"x": 0, "y": 0, "z": 0},
            "size": {"width": 20, "height": 1, "depth": 15},
        },
        {
            "id": "plate-az-2",
            "name": "App Subnet",
            "type": "subnet",
            "parentId": "plate-az-1",
            "children": ["block-az-1", "block-az-2"],
            "position": {"x": 2, "y": 0, "z": 2},
            "size": {"width": 16, "height": 1, "depth": 11},
        },
    ],
    "blocks": [
        {
            "id": "block-az-1",
            "name": "App Gateway",
            "category": "gateway",
            "placementId": "plate-az-2",
            "position": {"x": 2, "y": 0, "z": 2},
            "provider": "azure",
            "subtype": "application-gateway",
        },
        {
            "id": "block-az-2",
            "name": "SQL DB",
            "category": "database",
            "placementId": "plate-az-2",
            "position": {"x": 6, "y": 0, "z": 2},
            "provider": "azure",
            "subtype": "sql-database",
        },
    ],
    "connections": [
        {
            "id": "conn-az-1",
            "sourceId": "block-az-1",
            "targetId": "block-az-2",
            "type": "data",
        },
    ],
    "externalActors": [],
}

VALID_GCP_ARCHITECTURE: dict[str, object] = {
    "plates": [
        {
            "id": "plate-gcp-1",
            "name": "GCP Region",
            "type": "region",
            "parentId": None,
            "children": ["plate-gcp-2"],
            "position": {"x": 0, "y": 0, "z": 0},
            "size": {"width": 20, "height": 1, "depth": 15},
        },
        {
            "id": "plate-gcp-2",
            "name": "App Subnet",
            "type": "subnet",
            "parentId": "plate-gcp-1",
            "children": ["block-gcp-1", "block-gcp-2"],
            "position": {"x": 2, "y": 0, "z": 2},
            "size": {"width": 16, "height": 1, "depth": 11},
        },
    ],
    "blocks": [
        {
            "id": "block-gcp-1",
            "name": "Cloud Run",
            "category": "compute",
            "placementId": "plate-gcp-2",
            "position": {"x": 2, "y": 0, "z": 2},
            "provider": "gcp",
            "subtype": "cloud-run",
        },
        {
            "id": "block-gcp-2",
            "name": "Cloud SQL",
            "category": "database",
            "placementId": "plate-gcp-2",
            "position": {"x": 6, "y": 0, "z": 2},
            "provider": "gcp",
            "subtype": "cloud-sql-postgres",
        },
    ],
    "connections": [
        {
            "id": "conn-gcp-1",
            "sourceId": "block-gcp-1",
            "targetId": "block-gcp-2",
            "type": "data",
        },
    ],
    "externalActors": [],
}

SUGGESTION_RESPONSE: dict[str, object] = {
    "suggestions": [
        {
            "category": "security",
            "severity": "critical",
            "message": "No WAF protection in front of ALB",
            "action_description": "Add AWS WAF to protect against common web exploits",
        },
        {
            "category": "reliability",
            "severity": "warning",
            "message": "Single AZ deployment",
            "action_description": "Deploy across multiple availability zones",
        },
        {
            "category": "best_practice",
            "severity": "info",
            "message": "No observability stack",
            "action_description": "Add CloudWatch monitoring for all resources",
        },
    ],
    "score": {"security": 45, "reliability": 60, "best_practice": 70},
}

COST_ESTIMATE = CostEstimate(
    monthly_cost=156.75,
    hourly_cost=156.75 / 730,
    currency="USD",
    resources=[
        CostResource(
            name="Web ALB",
            monthly_cost=22.27,
            details={"resourceType": "aws_lb"},
        ),
        CostResource(
            name="App ECS",
            monthly_cost=73.00,
            details={"resourceType": "aws_ecs_service"},
        ),
        CostResource(
            name="App DB",
            monthly_cost=61.48,
            details={"resourceType": "aws_db_instance"},
        ),
    ],
)


async def _store_api_key(db: Database, user_id: str, provider: str = "openai") -> None:
    key_manager = cast(KeyManager, get_key_manager())
    encrypted_key = key_manager.encrypt("sk-test-key-e2e")
    api_key = AIApiKey(
        id=generate_id(),
        user_id=user_id,
        provider=provider,
        encrypted_key=encrypted_key,
        created_at=datetime.now(timezone.utc),
    )
    _ = await SQLiteAIApiKeyRepository(db).upsert(api_key)


@pytest.mark.asyncio
async def test_e2e_full_ai_workflow(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    test_user: User,
    db: Database,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Full workflow: store key → generate → suggest → cost."""

    key_response = await client.post(
        "/api/v1/ai/keys",
        cookies=auth_cookies,
        json={"provider": "openai", "key": "sk-test-e2e-key"},
    )
    assert key_response.status_code == 200
    key_payload = key_response.json()
    assert key_payload["provider"] == "openai"
    assert "created_at" in key_payload

    list_response = await client.get("/api/v1/ai/keys", cookies=auth_cookies)
    assert list_response.status_code == 200
    keys = list_response.json()
    assert any(k["provider"] == "openai" for k in keys)

    async def mock_generate(
        self: OpenAIClient,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, object] | None = None,
    ) -> dict[str, object]:
        _ = self
        _ = response_schema
        assert "Complexity target" in system_prompt
        return VALID_THREE_TIER

    monkeypatch.setattr(OpenAIClient, "generate", mock_generate)

    gen_response = await client.post(
        "/api/v1/ai/generate",
        cookies=auth_cookies,
        json={
            "prompt": "Three-tier web app with ALB, ECS, and RDS",
            "provider": "aws",
            "complexity": "intermediate",
        },
    )
    assert gen_response.status_code == 200
    gen_payload = cast(dict[str, object], gen_response.json())
    architecture = gen_payload["architecture"]
    assert isinstance(architecture, dict)
    warnings = gen_payload["warnings"]
    assert isinstance(warnings, list)
    assert len(warnings) == 0  # Valid architecture should have no warnings

    async def mock_suggest(
        self: OpenAIClient,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, object] | None = None,
    ) -> dict[str, object]:
        _ = self
        _ = system_prompt
        _ = response_schema
        return SUGGESTION_RESPONSE

    monkeypatch.setattr(OpenAIClient, "generate", mock_suggest)

    suggest_response = await client.post(
        "/api/v1/ai/suggest",
        cookies=auth_cookies,
        json={"architecture": architecture, "provider": "aws"},
    )
    assert suggest_response.status_code == 200
    suggest_payload = cast(dict[str, object], suggest_response.json())
    suggestions = suggest_payload["suggestions"]
    assert isinstance(suggestions, list)
    assert len(suggestions) == 3
    score = suggest_payload["score"]
    assert isinstance(score, dict)
    assert score["security"] == 45

    async def mock_estimate(
        self: InfracostClient,
        terraform_dir: str,
    ) -> CostEstimate:
        _ = self
        assert Path(terraform_dir).exists()
        return COST_ESTIMATE

    monkeypatch.setattr(InfracostClient, "estimate", mock_estimate)

    cost_response = await client.post(
        "/api/v1/ai/cost",
        cookies=auth_cookies,
        json={"architecture": architecture, "provider": "aws"},
    )
    assert cost_response.status_code == 200
    cost_payload = cast(dict[str, object], cost_response.json())
    assert cost_payload["monthly_cost"] == 156.75
    assert cost_payload["currency"] == "USD"
    resources = cost_payload["resources"]
    assert isinstance(resources, list)
    assert len(resources) == 3

    del_response = await client.delete(
        "/api/v1/ai/keys/openai",
        cookies=auth_cookies,
    )
    assert del_response.status_code == 200
    assert del_response.json()["deleted"] is True


@pytest.mark.asyncio
async def test_e2e_generate_azure_provider(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    test_user: User,
    db: Database,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Generate with Azure provider produces valid architecture."""
    await _store_api_key(db, test_user.id)

    async def mock_generate(
        self: OpenAIClient,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, object] | None = None,
    ) -> dict[str, object]:
        _ = self
        _ = response_schema
        assert "azure" in system_prompt.lower()
        return VALID_AZURE_ARCHITECTURE

    monkeypatch.setattr(OpenAIClient, "generate", mock_generate)

    response = await client.post(
        "/api/v1/ai/generate",
        cookies=auth_cookies,
        json={
            "prompt": "Web app with Application Gateway and SQL Database",
            "provider": "azure",
            "complexity": "simple",
        },
    )

    assert response.status_code == 200
    payload = cast(dict[str, object], response.json())
    assert payload["warnings"] == []
    architecture = payload["architecture"]
    assert isinstance(architecture, dict)
    blocks = cast(list[dict[str, object]], architecture.get("blocks"))
    assert all(cast(str, b.get("provider")) == "azure" for b in blocks)


@pytest.mark.asyncio
async def test_e2e_generate_gcp_provider(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    test_user: User,
    db: Database,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Generate with GCP provider produces valid architecture."""
    await _store_api_key(db, test_user.id)

    async def mock_generate(
        self: OpenAIClient,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, object] | None = None,
    ) -> dict[str, object]:
        _ = self
        _ = response_schema
        assert "gcp" in system_prompt.lower()
        return VALID_GCP_ARCHITECTURE

    monkeypatch.setattr(OpenAIClient, "generate", mock_generate)

    response = await client.post(
        "/api/v1/ai/generate",
        cookies=auth_cookies,
        json={
            "prompt": "Cloud Run with Cloud SQL",
            "provider": "gcp",
            "complexity": "simple",
        },
    )

    assert response.status_code == 200
    payload = cast(dict[str, object], response.json())
    assert payload["warnings"] == []
    architecture = payload["architecture"]
    assert isinstance(architecture, dict)
    blocks = cast(list[dict[str, object]], architecture.get("blocks"))
    assert all(cast(str, b.get("provider")) == "gcp" for b in blocks)


@pytest.mark.asyncio
async def test_e2e_cost_azure_architecture(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Cost endpoint correctly maps Azure subtypes to Terraform resources."""
    azure_cost = CostEstimate(
        monthly_cost=185.00,
        hourly_cost=185.00 / 730,
        currency="USD",
        resources=[
            CostResource(
                name="App Gateway",
                monthly_cost=125.00,
                details={"resourceType": "azurerm_application_gateway"},
            ),
            CostResource(
                name="SQL DB",
                monthly_cost=60.00,
                details={"resourceType": "azurerm_mssql_database"},
            ),
        ],
    )

    async def mock_estimate(
        self: InfracostClient,
        terraform_dir: str,
    ) -> CostEstimate:
        _ = self
        tf_path = Path(terraform_dir) / "main.tf.json"
        assert tf_path.exists()
        tf_json = json.loads(tf_path.read_text())
        resources = tf_json.get("resource", {})
        assert "azurerm_application_gateway" in resources
        assert "azurerm_mssql_database" in resources
        return azure_cost

    monkeypatch.setattr(InfracostClient, "estimate", mock_estimate)

    response = await client.post(
        "/api/v1/ai/cost",
        cookies=auth_cookies,
        json={"architecture": VALID_AZURE_ARCHITECTURE, "provider": "azure"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["monthly_cost"] == 185.00
    assert len(payload["resources"]) == 2


@pytest.mark.asyncio
async def test_e2e_cost_gcp_architecture(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Cost endpoint correctly maps GCP subtypes to Terraform resources."""
    gcp_cost = CostEstimate(
        monthly_cost=95.00,
        hourly_cost=95.00 / 730,
        currency="USD",
        resources=[
            CostResource(
                name="Cloud Run",
                monthly_cost=35.00,
                details={"resourceType": "google_cloud_run_service"},
            ),
            CostResource(
                name="Cloud SQL",
                monthly_cost=60.00,
                details={"resourceType": "google_sql_database_instance"},
            ),
        ],
    )

    async def mock_estimate(
        self: InfracostClient,
        terraform_dir: str,
    ) -> CostEstimate:
        _ = self
        tf_path = Path(terraform_dir) / "main.tf.json"
        assert tf_path.exists()
        tf_json = json.loads(tf_path.read_text())
        resources = tf_json.get("resource", {})
        assert "google_cloud_run_service" in resources
        assert "google_sql_database_instance" in resources
        return gcp_cost

    monkeypatch.setattr(InfracostClient, "estimate", mock_estimate)

    response = await client.post(
        "/api/v1/ai/cost",
        cookies=auth_cookies,
        json={"architecture": VALID_GCP_ARCHITECTURE, "provider": "gcp"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["monthly_cost"] == 95.00
    assert len(payload["resources"]) == 2


@pytest.mark.asyncio
async def test_e2e_unauthenticated_all_endpoints(
    client: AsyncClient,
) -> None:
    """All AI endpoints return 401 for unauthenticated requests."""
    endpoints = [
        ("/api/v1/ai/generate", {"prompt": "test", "provider": "aws"}),
        ("/api/v1/ai/suggest", {"architecture": {}, "provider": "aws"}),
        ("/api/v1/ai/cost", {"architecture": {"blocks": []}, "provider": "aws"}),
    ]

    for url, body in endpoints:
        response = await client.post(url, json=body)
        assert response.status_code == 401, f"Expected 401 for {url}, got {response.status_code}"
        assert response.json()["error"]["code"] == "UNAUTHORIZED"

    key_get = await client.get("/api/v1/ai/keys")
    assert key_get.status_code == 401

    key_post = await client.post(
        "/api/v1/ai/keys",
        json={"provider": "openai", "key": "sk-test"},
    )
    assert key_post.status_code == 401

    key_delete = await client.delete("/api/v1/ai/keys/openai")
    assert key_delete.status_code == 401


@pytest.mark.asyncio
async def test_e2e_generate_llm_failure_propagates(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    test_user: User,
    db: Database,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """LLM errors during generate propagate as 500 GENERATION_FAILED."""
    await _store_api_key(db, test_user.id)

    async def mock_generate_fail(
        self: OpenAIClient,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, object] | None = None,
    ) -> dict[str, object]:
        _ = self
        _ = system_prompt
        _ = response_schema
        raise LLMError("Rate limited by OpenAI")

    monkeypatch.setattr(OpenAIClient, "generate", mock_generate_fail)

    response = await client.post(
        "/api/v1/ai/generate",
        cookies=auth_cookies,
        json={"prompt": "test", "provider": "aws", "complexity": "simple"},
    )

    assert response.status_code == 500
    payload = response.json()
    assert payload["error"]["code"] == "GENERATION_FAILED"
    assert "Rate limited" in payload["error"]["message"]


@pytest.mark.asyncio
async def test_e2e_suggest_llm_failure_returns_empty(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    test_user: User,
    db: Database,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """LLM errors during suggest return empty suggestions (graceful degradation)."""
    await _store_api_key(db, test_user.id)

    async def mock_generate_fail(
        self: OpenAIClient,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, object] | None = None,
    ) -> dict[str, object]:
        _ = self
        _ = system_prompt
        _ = response_schema
        raise LLMError("Service unavailable")

    monkeypatch.setattr(OpenAIClient, "generate", mock_generate_fail)

    response = await client.post(
        "/api/v1/ai/suggest",
        cookies=auth_cookies,
        json={"architecture": VALID_THREE_TIER, "provider": "aws"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["suggestions"] == []
    assert payload["score"] == {}


@pytest.mark.asyncio
async def test_e2e_cost_empty_architecture(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Cost endpoint handles architectures with no blocks."""
    empty_cost = CostEstimate(
        monthly_cost=0.0,
        hourly_cost=0.0,
        currency="USD",
        resources=[],
    )

    async def mock_estimate(
        self: InfracostClient,
        terraform_dir: str,
    ) -> CostEstimate:
        _ = self
        return empty_cost

    monkeypatch.setattr(InfracostClient, "estimate", mock_estimate)

    response = await client.post(
        "/api/v1/ai/cost",
        cookies=auth_cookies,
        json={"architecture": {"blocks": []}, "provider": "aws"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["monthly_cost"] == 0.0
    assert payload["resources"] == []


@pytest.mark.asyncio
async def test_e2e_cost_unknown_subtypes_skipped(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Cost endpoint silently skips blocks with unknown subtypes."""
    architecture: dict[str, object] = {
        "blocks": [
            {
                "id": "block-1",
                "name": "Known",
                "category": "gateway",
                "placementId": "plate-1",
                "position": {"x": 2, "y": 0, "z": 2},
                "provider": "aws",
                "subtype": "alb",
            },
            {
                "id": "block-2",
                "name": "Unknown",
                "category": "compute",
                "placementId": "plate-1",
                "position": {"x": 6, "y": 0, "z": 2},
                "provider": "aws",
                "subtype": "custom-unknown",
            },
        ],
    }

    single_cost = CostEstimate(
        monthly_cost=22.27,
        hourly_cost=22.27 / 730,
        currency="USD",
        resources=[
            CostResource(
                name="Known",
                monthly_cost=22.27,
                details={"resourceType": "aws_lb"},
            ),
        ],
    )

    async def mock_estimate(
        self: InfracostClient,
        terraform_dir: str,
    ) -> CostEstimate:
        _ = self
        tf_path = Path(terraform_dir) / "main.tf.json"
        tf_json = json.loads(tf_path.read_text())
        resources = tf_json.get("resource", {})
        assert "aws_lb" in resources
        assert "custom-unknown" not in str(resources)
        return single_cost

    monkeypatch.setattr(InfracostClient, "estimate", mock_estimate)

    response = await client.post(
        "/api/v1/ai/cost",
        cookies=auth_cookies,
        json={"architecture": architecture, "provider": "aws"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["monthly_cost"] == 22.27
    assert len(payload["resources"]) == 1


@pytest.mark.asyncio
async def test_e2e_generate_with_validation_warnings(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    test_user: User,
    db: Database,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Generate returns architecture with validation warnings for invalid output."""
    await _store_api_key(db, test_user.id)

    # Architecture with invalid category and broken reference
    invalid_architecture: dict[str, object] = {
        "plates": [
            {
                "id": "plate-1",
                "name": "VPC",
                "type": "region",
                "parentId": None,
                "children": [],
                "position": {"x": 0, "y": 0, "z": 0},
                "size": {"width": 20, "height": 1, "depth": 15},
            },
        ],
        "blocks": [
            {
                "id": "block-1",
                "name": "Server",
                "category": "networking",  # Invalid category
                "placementId": "plate-nonexistent",  # Invalid reference
                "position": {"x": 2, "y": 0, "z": 2},
                "provider": "aws",
                "subtype": "ec2",
            },
        ],
        "connections": [
            {
                "id": "conn-1",
                "sourceId": "block-1",
                "targetId": "block-1",  # Self-connection
                "type": "http",
            },
        ],
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
        _ = response_schema
        return invalid_architecture

    monkeypatch.setattr(OpenAIClient, "generate", mock_generate)

    response = await client.post(
        "/api/v1/ai/generate",
        cookies=auth_cookies,
        json={"prompt": "build something", "provider": "aws", "complexity": "simple"},
    )

    assert response.status_code == 200
    payload = cast(dict[str, object], response.json())
    warnings = payload["warnings"]
    assert isinstance(warnings, list)
    # Should have warnings for: invalid category, invalid placementId, self-connection
    assert len(warnings) >= 3
    warning_text = " ".join(str(w) for w in warnings)
    assert "category" in warning_text.lower()
    assert "placementId" in warning_text.lower() or "placement" in warning_text.lower()
    assert "self-connection" in warning_text.lower()


@pytest.mark.asyncio
async def test_e2e_api_key_lifecycle(
    client: AsyncClient,
    auth_cookies: dict[str, str],
) -> None:
    """Full key lifecycle: create → list → delete → confirm deleted."""

    create_resp = await client.post(
        "/api/v1/ai/keys",
        cookies=auth_cookies,
        json={"provider": "openai", "key": "sk-lifecycle-test"},
    )
    assert create_resp.status_code == 200
    assert create_resp.json()["provider"] == "openai"

    list_resp = await client.get("/api/v1/ai/keys", cookies=auth_cookies)
    assert list_resp.status_code == 200
    providers = [k["provider"] for k in list_resp.json()]
    assert "openai" in providers

    del_resp = await client.delete("/api/v1/ai/keys/openai", cookies=auth_cookies)
    assert del_resp.status_code == 200
    assert del_resp.json()["deleted"] is True

    list_after = await client.get("/api/v1/ai/keys", cookies=auth_cookies)
    assert list_after.status_code == 200
    providers_after = [k["provider"] for k in list_after.json()]
    assert "openai" not in providers_after


@pytest.mark.asyncio
async def test_e2e_suggest_all_providers(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    test_user: User,
    db: Database,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Suggest endpoint works for all three cloud providers."""
    await _store_api_key(db, test_user.id)

    provider_architectures = [
        ("aws", VALID_THREE_TIER),
        ("azure", VALID_AZURE_ARCHITECTURE),
        ("gcp", VALID_GCP_ARCHITECTURE),
    ]

    async def mock_generate(
        self: OpenAIClient,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, object] | None = None,
    ) -> dict[str, object]:
        _ = self
        _ = system_prompt
        _ = response_schema
        return SUGGESTION_RESPONSE

    monkeypatch.setattr(OpenAIClient, "generate", mock_generate)

    for provider, architecture in provider_architectures:
        response = await client.post(
            "/api/v1/ai/suggest",
            cookies=auth_cookies,
            json={"architecture": architecture, "provider": provider},
        )
        assert (
            response.status_code == 200
        ), f"Suggest failed for provider {provider}: {response.text}"
        payload = response.json()
        assert len(payload["suggestions"]) == 3
        assert "security" in payload["score"]


@pytest.mark.asyncio
async def test_e2e_complexity_levels(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    test_user: User,
    db: Database,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Generate endpoint accepts all complexity levels."""
    await _store_api_key(db, test_user.id)

    prompts_received: list[str] = []

    async def mock_generate(
        self: OpenAIClient,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, object] | None = None,
    ) -> dict[str, object]:
        _ = self
        _ = response_schema
        prompts_received.append(system_prompt)
        return VALID_THREE_TIER

    monkeypatch.setattr(OpenAIClient, "generate", mock_generate)

    for complexity in ("simple", "intermediate", "advanced"):
        response = await client.post(
            "/api/v1/ai/generate",
            cookies=auth_cookies,
            json={
                "prompt": f"Test {complexity}",
                "provider": "aws",
                "complexity": complexity,
            },
        )
        assert response.status_code == 200, f"Generate failed for complexity {complexity}"

    # Verify each complexity target was included in the system prompt
    assert len(prompts_received) == 3
    assert "simple" in prompts_received[0]
    assert "intermediate" in prompts_received[1]
    assert "advanced" in prompts_received[2]
