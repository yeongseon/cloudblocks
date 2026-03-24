"""CloudBlocks API - Rule validation engine.

Server-side implementation of the same rules that run client-side,
ensuring consistent validation regardless of client behavior.

v2.0: Updated for v2.0 container layer types (global, edge, region, zone, subnet).
      Removed timer category. Added analytics, identity, observability.
"""

from typing import Any


def validate_architecture(architecture: dict[str, Any]) -> dict[str, Any]:
    """Validate an architecture model against all rules.

    Args:
        architecture: Deserialized ArchitectureModel

    Returns:
        ValidationResult dict with valid, errors, and warnings fields
    """
    errors: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []

    # TODO: Keep the legacy "plates" wire-format key for API compatibility.
    container_blocks = architecture.get("plates", [])
    blocks = architecture.get("blocks", [])
    connections = architecture.get("connections", [])
    external_actors = architecture.get("externalActors", [])

    # Placement validation
    for block in blocks:
        container_block = next(
            (p for p in container_blocks if p["id"] == block["placementId"]),
            None,
        )
        error = _validate_placement(block, container_block)
        if error:
            if error["severity"] == "error":
                errors.append(error)
            else:
                warnings.append(error)

    # Connection validation
    for conn in connections:
        error = _validate_connection(conn, blocks, external_actors)
        if error:
            if error["severity"] == "error":
                errors.append(error)
            else:
                warnings.append(error)

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
    }


def _validate_placement(
    block: dict[str, Any], container_block: dict[str, Any] | None
) -> dict[str, Any] | None:
    """Validate block placement on a container block."""
    if not container_block:
        return {
            "ruleId": "rule-container-block-exists",
            "severity": "error",
            "message": f'Block "{block["name"]}" is not placed on any container block',
            "suggestion": "Place the block on a valid subnet container block",
            "targetId": block["id"],
        }

    category = block["category"]
    container_layer = container_block["type"]
    subnet_access = container_block.get("subnetAccess")

    # Subnet-based block rules
    subnet_rules = {
        "compute": (container_layer == "subnet", "rule-compute-subnet", "Subnet Block"),
        "database": (
            container_layer == "subnet" and subnet_access == "private",
            "rule-db-private",
            "private Subnet Block",
        ),
        "gateway": (
            container_layer == "subnet" and subnet_access == "public",
            "rule-gw-public",
            "public Subnet Block",
        ),
        "storage": (container_layer == "subnet", "rule-storage-subnet", "Subnet Block"),
    }

    # Managed-service block rules (v2.0) — must NOT be on subnet
    managed_rules = {
        "function": (
            container_layer != "subnet",
            "rule-function-region",
            "Region/Zone Block (not Subnet)",
        ),
        "queue": (
            container_layer != "subnet",
            "rule-queue-region",
            "Region/Zone Block (not Subnet)",
        ),
        "event": (
            container_layer != "subnet",
            "rule-event-region",
            "Region/Zone Block (not Subnet)",
        ),
        "analytics": (
            container_layer != "subnet",
            "rule-analytics-region",
            "Region/Zone Block (not Subnet)",
        ),
        "identity": (
            container_layer != "subnet",
            "rule-identity-region",
            "Region/Zone Block (not Subnet)",
        ),
        "observability": (
            container_layer != "subnet",
            "rule-observability-region",
            "Region/Zone Block (not Subnet)",
        ),
    }

    if category in subnet_rules:
        valid, rule_id, target_desc = subnet_rules[category]
        if not valid:
            return {
                "ruleId": rule_id,
                "severity": "error",
                "message": (
                    f'{category.title()} block "{block["name"]}"'
                    f" must be placed on a {target_desc}"
                ),
                "suggestion": f"Move the {category.title()} block to a {target_desc}",
                "targetId": block["id"],
            }

    if category in managed_rules:
        valid, rule_id, target_desc = managed_rules[category]
        if not valid:
            return {
                "ruleId": rule_id,
                "severity": "error",
                "message": (
                    f'{category.title()} block "{block["name"]}"'
                    f" must be placed on a {target_desc}"
                ),
                "suggestion": f"Move the {category.title()} block to a {target_desc}",
                "targetId": block["id"],
            }

    return None


def _validate_connection(
    connection: dict[str, Any],
    blocks: list[dict[str, Any]],
    external_actors: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Validate a connection between endpoints."""
    # Connection adjacency table (v2.0 — includes managed services)
    allowed = {
        "internet": {"gateway"},
        "gateway": {"compute", "function"},
        "compute": {"database", "storage"},
        "function": {"storage", "database", "queue"},
        "queue": {"function"},
        "event": {"function"},
        "analytics": {"database", "storage"},
        "identity": set(),
        "observability": set(),
    }

    source_type = _get_endpoint_type(connection["sourceId"], blocks, external_actors)
    target_type = _get_endpoint_type(connection["targetId"], blocks, external_actors)

    if not source_type or not target_type:
        return {
            "ruleId": "rule-conn-endpoint",
            "severity": "error",
            "message": "Connection references a missing endpoint",
            "targetId": connection["id"],
        }

    if connection["sourceId"] == connection["targetId"]:
        return {
            "ruleId": "rule-conn-self",
            "severity": "error",
            "message": "A block cannot connect to itself",
            "targetId": connection["id"],
        }

    allowed_targets = allowed.get(source_type, set())
    if target_type not in allowed_targets:
        return {
            "ruleId": "rule-conn-invalid",
            "severity": "error",
            "message": f"Invalid connection: {source_type} → {target_type}",
            "suggestion": f"{source_type} cannot initiate a request to {target_type}",
            "targetId": connection["id"],
        }

    return None


def _get_endpoint_type(
    endpoint_id: str,
    blocks: list[dict[str, Any]],
    external_actors: list[dict[str, Any]],
) -> str | None:
    """Get the type of a connection endpoint."""
    block = next((b for b in blocks if b["id"] == endpoint_id), None)
    if block:
        return block["category"]

    actor = next((a for a in external_actors if a["id"] == endpoint_id), None)
    if actor:
        return actor["type"]

    return None
