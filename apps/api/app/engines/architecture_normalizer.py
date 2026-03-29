from __future__ import annotations

from typing import Any


def _extract_containers_and_resources(
    architecture: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    nodes = architecture.get("nodes", [])
    if isinstance(nodes, list) and nodes:
        containers = [n for n in nodes if isinstance(n, dict) and n.get("kind") == "container"]
        resources = [n for n in nodes if isinstance(n, dict) and n.get("kind") == "resource"]
        return containers, resources

    plates = architecture.get("plates", [])
    blocks = architecture.get("blocks", [])
    return (
        plates if isinstance(plates, list) else [],
        blocks if isinstance(blocks, list) else [],
    )


def extract_containers_and_resources(
    architecture: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    return _extract_containers_and_resources(architecture)
