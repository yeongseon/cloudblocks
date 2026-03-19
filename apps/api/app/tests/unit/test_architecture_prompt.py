from __future__ import annotations

import re

import pytest

from app.engines.prompts.architecture_prompt import (
    build_architecture_prompt,
    get_provider_subtypes,
)


def test_build_architecture_prompt_returns_string() -> None:
    prompt = build_architecture_prompt("aws")

    assert isinstance(prompt, str)


def test_prompt_contains_all_block_categories() -> None:
    prompt = build_architecture_prompt("aws")

    for category in (
        "compute",
        "database",
        "storage",
        "gateway",
        "function",
        "queue",
        "event",
        "analytics",
        "identity",
        "observability",
    ):
        assert category in prompt


def test_prompt_contains_all_connection_types() -> None:
    prompt = build_architecture_prompt("aws")

    for connection_type in ("dataflow", "http", "internal", "data", "async"):
        assert connection_type in prompt


def test_prompt_contains_all_provider_types() -> None:
    prompt = build_architecture_prompt("aws")

    for provider in ("aws", "azure", "gcp"):
        assert provider in prompt


@pytest.mark.parametrize(
    ("provider", "subtypes"),
    [
        (
            "aws",
            (
                "ec2",
                "ecs",
                "lambda",
                "rds-postgres",
                "dynamodb",
                "elasticache",
                "s3",
                "alb",
                "api-gateway",
                "nat-gateway",
                "sqs",
                "sns",
                "eventbridge",
                "kinesis",
                "redshift",
                "iam",
                "cloudwatch",
            ),
        ),
        (
            "azure",
            (
                "vm",
                "container-instances",
                "aks",
                "sql-database",
                "cosmos-db",
                "cache-for-redis",
                "blob-storage",
                "application-gateway",
                "api-management",
                "firewall",
                "functions",
                "service-bus",
                "event-grid",
                "event-hubs",
                "synapse",
                "entra-id",
                "monitor",
            ),
        ),
        (
            "gcp",
            (
                "compute-engine",
                "cloud-run",
                "gke",
                "cloud-sql-postgres",
                "cloud-spanner",
                "memorystore",
                "cloud-storage",
                "cloud-load-balancing",
                "api-gateway",
                "cloud-armor",
                "cloud-functions",
                "pub-sub",
                "eventarc",
                "bigquery",
                "dataflow",
                "cloud-iam",
                "cloud-monitoring",
            ),
        ),
    ],
)
def test_prompt_contains_provider_specific_subtypes(
    provider: str, subtypes: tuple[str, ...]
) -> None:
    prompt = build_architecture_prompt(provider)

    for subtype in subtypes:
        assert subtype in prompt


def test_prompt_contains_two_json_examples_patterns() -> None:
    prompt = build_architecture_prompt("aws")

    assert len(re.findall(r'"plate-[^\"]+"', prompt)) >= 2
    assert len(re.findall(r'"block-[^\"]+"', prompt)) >= 4


def test_prompt_contains_placement_rules_text() -> None:
    prompt = build_architecture_prompt("aws")

    assert "placementId MUST reference an existing plate id" in prompt
    assert "Region plates should contain at least one subnet" in prompt


def test_prompt_contains_connection_rules_text() -> None:
    prompt = build_architecture_prompt("aws")

    assert (
        "sourceId and targetId must reference existing block ids or external actor ids"
        in prompt
    )
    assert "No self-connections" in prompt
    assert "No duplicate connections" in prompt


def test_get_provider_subtypes_for_aws_contains_ec2() -> None:
    subtypes = get_provider_subtypes("aws")

    assert isinstance(subtypes, str)
    assert "ec2" in subtypes


def test_get_provider_subtypes_invalid_provider_raises_value_error() -> None:
    with pytest.raises(ValueError):
        _ = get_provider_subtypes("invalid")
