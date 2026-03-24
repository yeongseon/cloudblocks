"""Architecture validation post-processor for LLM output.

Validates that LLM-generated architectures conform to the CloudBlocks
domain model: correct enums, referential integrity, unique IDs, and
structural constraints.
"""

from __future__ import annotations

from app.engines.prompts.architecture_prompt import (
    BLOCK_CATEGORIES,
    CONNECTION_TYPES,
    LAYER_TYPES,
    PROVIDER_TYPES,
    SUBTYPE_REGISTRY,
)


class ArchitectureValidator:
    def validate(self, architecture: dict[str, object]) -> list[str]:
        """Return a list of human-readable warning strings. Empty = valid."""
        warnings: list[str] = []

        container_blocks = architecture.get("plates")
        blocks = architecture.get("blocks")
        connections = architecture.get("connections")

        if not isinstance(container_blocks, list):
            warnings.append("Missing or invalid 'plates' array")
            container_blocks = []
        if not isinstance(blocks, list):
            warnings.append("Missing or invalid 'blocks' array")
            blocks = []
        if not isinstance(connections, list):
            warnings.append("Missing or invalid 'connections' array")
            connections = []

        container_block_ids = self._validate_plates(container_blocks, warnings)
        block_ids = self._validate_blocks(blocks, container_block_ids, warnings)
        self._validate_connections(connections, block_ids, warnings)
        self._check_duplicate_ids(container_blocks, blocks, connections, warnings)

        return warnings

    def _validate_plates(
        self,
        container_blocks: list[object],
        warnings: list[str],
    ) -> set[str]:
        container_block_ids: set[str] = set()
        for i, raw_container_block in enumerate(container_blocks):
            if not isinstance(raw_container_block, dict):
                warnings.append(f"plates[{i}]: not a valid object")
                continue
            container_block: dict[str, object] = raw_container_block  # type: ignore[assignment]

            container_block_id = container_block.get("id")
            if not isinstance(container_block_id, str) or not container_block_id:
                warnings.append(f"plates[{i}]: missing or invalid 'id'")
            else:
                container_block_ids.add(container_block_id)

            container_layer = container_block.get("type")
            if not isinstance(container_layer, str) or container_layer not in LAYER_TYPES:
                warnings.append(
                    f"plates[{i}]: invalid type"
                    f" '{container_layer}',"
                    f" expected one of {LAYER_TYPES}"
                )

            children = container_block.get("children")
            if children is not None and not isinstance(children, list):
                warnings.append(f"plates[{i}]: 'children' must be an array")

        return container_block_ids

    def _validate_blocks(
        self,
        blocks: list[object],
        container_block_ids: set[str],
        warnings: list[str],
    ) -> set[str]:
        block_ids: set[str] = set()
        for i, raw_block in enumerate(blocks):
            if not isinstance(raw_block, dict):
                warnings.append(f"blocks[{i}]: not a valid object")
                continue
            block: dict[str, object] = raw_block  # type: ignore[assignment]

            block_id = block.get("id")
            if not isinstance(block_id, str) or not block_id:
                warnings.append(f"blocks[{i}]: missing or invalid 'id'")
            else:
                block_ids.add(block_id)

            category = block.get("category")
            if not isinstance(category, str) or category not in BLOCK_CATEGORIES:
                warnings.append(
                    f"blocks[{i}]: invalid category '{category}', "
                    f"expected one of {BLOCK_CATEGORIES}"
                )

            provider = block.get("provider")
            if not isinstance(provider, str) or provider not in PROVIDER_TYPES:
                warnings.append(
                    f"blocks[{i}]: invalid provider '{provider}', "
                    f"expected one of {PROVIDER_TYPES}"
                )

            subtype = block.get("subtype")
            if isinstance(category, str) and isinstance(provider, str):
                valid_subtypes = SUBTYPE_REGISTRY.get(provider, {}).get(category, ())
                if isinstance(subtype, str) and valid_subtypes and subtype not in valid_subtypes:
                    warnings.append(
                        f"blocks[{i}]: invalid subtype '{subtype}' for "
                        f"{provider}/{category}, expected one of {valid_subtypes}"
                    )

            placement_id = block.get("placementId")
            if not isinstance(placement_id, str) or not placement_id:
                warnings.append(f"blocks[{i}]: missing 'placementId'")
            elif placement_id not in container_block_ids:
                warnings.append(
                    f"blocks[{i}]: placementId '{placement_id}' "
                    f"does not reference a known container block"
                )

        return block_ids

    def _validate_connections(
        self,
        connections: list[object],
        block_ids: set[str],
        warnings: list[str],
    ) -> None:
        for i, raw_conn in enumerate(connections):
            if not isinstance(raw_conn, dict):
                warnings.append(f"connections[{i}]: not a valid object")
                continue
            conn: dict[str, object] = raw_conn  # type: ignore[assignment]

            conn_type = conn.get("type")
            if not isinstance(conn_type, str) or conn_type not in CONNECTION_TYPES:
                warnings.append(
                    f"connections[{i}]: invalid type '{conn_type}', "
                    f"expected one of {CONNECTION_TYPES}"
                )

            source_id = conn.get("sourceId")
            target_id = conn.get("targetId")

            if not isinstance(source_id, str) or not source_id:
                warnings.append(f"connections[{i}]: missing 'sourceId'")
            elif source_id not in block_ids:
                warnings.append(
                    f"connections[{i}]: sourceId '{source_id}' " f"does not reference a known block"
                )

            if not isinstance(target_id, str) or not target_id:
                warnings.append(f"connections[{i}]: missing 'targetId'")
            elif target_id not in block_ids:
                warnings.append(
                    f"connections[{i}]: targetId '{target_id}' " f"does not reference a known block"
                )

            if isinstance(source_id, str) and isinstance(target_id, str) and source_id == target_id:
                warnings.append(f"connections[{i}]: self-connection not allowed")

    def _check_duplicate_ids(
        self,
        container_blocks: list[object],
        blocks: list[object],
        connections: list[object],
        warnings: list[str],
    ) -> None:
        all_ids: list[str] = []
        for item in (*container_blocks, *blocks, *connections):
            if isinstance(item, dict):
                item_id = item.get("id")
                if isinstance(item_id, str):
                    all_ids.append(item_id)

        seen: set[str] = set()
        for item_id in all_ids:
            if item_id in seen:
                warnings.append(f"Duplicate id '{item_id}' found")
            seen.add(item_id)
