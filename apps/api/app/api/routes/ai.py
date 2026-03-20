from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.config import settings
from app.core.dependencies import get_ai_api_key_repo, get_current_user, get_key_manager
from app.core.errors import GenerationError, ValidationError
from app.domain.models.ai_entities import (
    AIGenerationRequest,
    AIGenerationResponse,
    AISuggestionsResponse,
    CostEstimate,
)
from app.domain.models.entities import User
from app.domain.models.repositories import AIApiKeyRepository
from app.engines.prompts.architecture_prompt import build_architecture_prompt
from app.engines.suggestions import SuggestionEngine
from app.engines.validation import ArchitectureValidator
from app.infrastructure.cost.infracost_client import InfracostClient, InfracostError
from app.infrastructure.llm.client import LLMError, OpenAIClient
from app.infrastructure.llm.key_manager import KeyManager

router = APIRouter(prefix="/ai", tags=["ai"])


class AISuggestRequest(BaseModel):
    architecture: dict[str, object]
    provider: str = "aws"


class AICostRequest(BaseModel):
    architecture: dict[str, object]
    provider: str = "aws"


def build_system_prompt(provider: str, complexity: str) -> str:
    prompt = build_architecture_prompt(provider)
    return f"{prompt}\n\nComplexity target: {complexity}."


@router.post("/generate")
async def generate_architecture(
    request: AIGenerationRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    ai_api_key_repo: Annotated[AIApiKeyRepository, Depends(get_ai_api_key_repo)],
    key_manager: Annotated[KeyManager, Depends(get_key_manager)],
) -> AIGenerationResponse:
    api_keys = await ai_api_key_repo.list_by_user(current_user.id)
    openai_key = next((item for item in api_keys if item.provider.lower() == "openai"), None)
    if openai_key is None:
        raise ValidationError("No OpenAI API key stored. Please add one via /api/v1/ai/keys")

    decrypted_key = key_manager.decrypt(openai_key.encrypted_key)
    client = OpenAIClient(
        api_key=decrypted_key,
        base_url=settings.llm_provider_url,
        model=settings.llm_model,
        max_tokens=settings.llm_max_tokens,
        timeout=settings.llm_request_timeout,
    )
    system_prompt = build_system_prompt(request.provider, request.complexity)

    try:
        architecture = await client.generate(
            system_prompt=system_prompt,
            user_prompt=request.prompt,
        )
    except LLMError as exc:
        raise GenerationError(f"AI generation failed: {exc}") from exc

    return AIGenerationResponse(
        architecture=architecture,
        warnings=ArchitectureValidator().validate(architecture),
    )


@router.post("/suggest")
async def suggest_improvements(
    request: AISuggestRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    ai_api_key_repo: Annotated[AIApiKeyRepository, Depends(get_ai_api_key_repo)],
    key_manager: Annotated[KeyManager, Depends(get_key_manager)],
) -> AISuggestionsResponse:
    api_keys = await ai_api_key_repo.list_by_user(current_user.id)
    openai_key = next((item for item in api_keys if item.provider.lower() == "openai"), None)
    if openai_key is None:
        raise ValidationError("No OpenAI API key stored. Please add one via /api/v1/ai/keys")

    decrypted_key = key_manager.decrypt(openai_key.encrypted_key)
    client = OpenAIClient(
        api_key=decrypted_key,
        base_url=settings.llm_provider_url,
        model=settings.llm_model,
        max_tokens=settings.llm_max_tokens,
        timeout=settings.llm_request_timeout,
    )
    engine = SuggestionEngine(client)

    try:
        return await engine.analyze(request.architecture, request.provider)
    except LLMError as exc:
        raise GenerationError(f"AI suggestion failed: {exc}") from exc


SUBTYPE_TO_TF_RESOURCE: dict[str, str] = {
    "ec2": "aws_instance",
    "ecs": "aws_ecs_service",
    "lambda": "aws_lambda_function",
    "rds-postgres": "aws_db_instance",
    "dynamodb": "aws_dynamodb_table",
    "elasticache": "aws_elasticache_cluster",
    "s3": "aws_s3_bucket",
    "alb": "aws_lb",
    "api-gateway": "aws_apigatewayv2_api",
    "nat-gateway": "aws_nat_gateway",
    "sqs": "aws_sqs_queue",
    "sns": "aws_sns_topic",
    "eventbridge": "aws_cloudwatch_event_bus",
    "kinesis": "aws_kinesis_stream",
    "redshift": "aws_redshift_cluster",
    "iam": "aws_iam_role",
    "cloudwatch": "aws_cloudwatch_log_group",
    "vm": "azurerm_virtual_machine",
    "container-instances": "azurerm_container_group",
    "aks": "azurerm_kubernetes_cluster",
    "sql-database": "azurerm_mssql_database",
    "cosmos-db": "azurerm_cosmosdb_account",
    "cache-for-redis": "azurerm_redis_cache",
    "blob-storage": "azurerm_storage_account",
    "application-gateway": "azurerm_application_gateway",
    "api-management": "azurerm_api_management",
    "firewall": "azurerm_firewall",
    "functions": "azurerm_function_app",
    "service-bus": "azurerm_servicebus_queue",
    "event-grid": "azurerm_eventgrid_topic",
    "event-hubs": "azurerm_eventhub",
    "synapse": "azurerm_synapse_workspace",
    "entra-id": "azurerm_user_assigned_identity",
    "monitor": "azurerm_monitor_action_group",
    "compute-engine": "google_compute_instance",
    "cloud-run": "google_cloud_run_service",
    "gke": "google_container_cluster",
    "cloud-sql-postgres": "google_sql_database_instance",
    "cloud-spanner": "google_spanner_instance",
    "memorystore": "google_redis_instance",
    "cloud-storage": "google_storage_bucket",
    "cloud-load-balancing": "google_compute_url_map",
    "cloud-armor": "google_compute_security_policy",
    "cloud-functions": "google_cloudfunctions_function",
    "pub-sub": "google_pubsub_topic",
    "eventarc": "google_eventarc_trigger",
    "bigquery": "google_bigquery_dataset",
    "dataflow": "google_dataflow_job",
    "cloud-iam": "google_project_iam_member",
    "cloud-monitoring": "google_monitoring_alert_policy",
}


def _architecture_to_tf_json(architecture: dict[str, object]) -> dict[str, object]:
    resources: dict[str, dict[str, dict[str, object]]] = {}
    blocks = architecture.get("blocks")
    if not isinstance(blocks, list):
        return {"resource": resources}

    for raw_block in blocks:
        if not isinstance(raw_block, dict):
            continue
        block: dict[str, object] = raw_block  # type: ignore[assignment]
        subtype = block.get("subtype")
        name = block.get("name", "unnamed")
        block_id = block.get("id", "unknown")

        if not isinstance(subtype, str):
            continue

        tf_type = SUBTYPE_TO_TF_RESOURCE.get(subtype)
        if tf_type is None:
            continue

        safe_name = str(block_id).replace("-", "_")
        if tf_type not in resources:
            resources[tf_type] = {}
        resources[tf_type][safe_name] = {"tags": {"Name": name if isinstance(name, str) else ""}}

    return {"resource": resources}


@router.post("/cost")
async def estimate_cost(
    request: AICostRequest,
    current_user: Annotated[User, Depends(get_current_user)],
) -> CostEstimate:
    _ = current_user

    tf_json = _architecture_to_tf_json(request.architecture)

    tmp_dir = tempfile.mkdtemp(prefix="cloudblocks_cost_")
    tf_path = Path(tmp_dir) / "main.tf.json"
    try:
        tf_path.write_text(json.dumps(tf_json, indent=2))
        client = InfracostClient(api_key=settings.infracost_api_key)
        return await client.estimate(tmp_dir)
    except InfracostError as exc:
        raise GenerationError(f"Cost estimation failed: {exc}") from exc
    finally:
        import shutil

        shutil.rmtree(tmp_dir, ignore_errors=True)
