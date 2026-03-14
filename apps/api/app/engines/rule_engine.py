"""CloudBlocks API - Rule validation engine.

Server-side implementation of the same rules that run client-side,
ensuring consistent validation regardless of client behavior.
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

    plates = architecture.get("plates", [])
    blocks = architecture.get("blocks", [])
    connections = architecture.get("connections", [])
    external_actors = architecture.get("externalActors", [])

    # Placement validation
    for block in blocks:
        plate = next((p for p in plates if p["id"] == block["placementId"]), None)
        error = _validate_placement(block, plate)
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


def _validate_placement(block: dict, plate: dict | None) -> dict | None:
    """Validate block placement on a plate."""
    if not plate:
        return {
            "ruleId": "rule-plate-exists",
            "severity": "error",
            "message": f'Block "{block["name"]}" is not placed on any plate',
            "suggestion": "Place the block on a valid subnet plate",
            "targetId": block["id"],
        }

    category = block["category"]
    plate_type = plate["type"]
    subnet_access = plate.get("subnetAccess")

    rules = {
        "compute": (plate_type == "subnet", "rule-compute-subnet", "Subnet Plate"),
        "database": (
            plate_type == "subnet" and subnet_access == "private",
            "rule-db-private",
            "private Subnet Plate",
        ),
        "gateway": (
            plate_type == "subnet" and subnet_access == "public",
            "rule-gw-public",
            "public Subnet Plate",
        ),
        "storage": (plate_type == "subnet", "rule-storage-subnet", "Subnet Plate"),
    }

    if category in rules:
        valid, rule_id, target_desc = rules[category]
        if not valid:
            return {
                "ruleId": rule_id,
                "severity": "error",
                "message": f'{category.title()} block "{block["name"]}" must be placed on a {target_desc}',
                "suggestion": f"Move the {category.title()} block to a {target_desc}",
                "targetId": block["id"],
            }

    return None


def _validate_connection(
    connection: dict, blocks: list[dict], external_actors: list[dict]
) -> dict | None:
    """Validate a connection between endpoints."""
    allowed = {
        "internet": {"gateway"},
        "gateway": {"compute"},
        "compute": {"database", "storage"},
        "database": {"compute"},
        "storage": {"compute"},
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
    endpoint_id: str, blocks: list[dict], external_actors: list[dict]
) -> str | None:
    """Get the type of a connection endpoint."""
    block = next((b for b in blocks if b["id"] == endpoint_id), None)
    if block:
        return block["category"]

    actor = next((a for a in external_actors if a["id"] == endpoint_id), None)
    if actor:
        return actor["type"]

    return None
