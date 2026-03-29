from __future__ import annotations

import pytest

from app.engines.validation import ArchitectureValidator


@pytest.fixture
def validator() -> ArchitectureValidator:
    return ArchitectureValidator()


def _minimal_architecture(
    *,
    container_blocks: list[object] | None = None,
    blocks: list[object] | None = None,
    connections: list[object] | None = None,
) -> dict[str, object]:
    return {
        "plates": container_blocks if container_blocks is not None else [],
        "blocks": blocks if blocks is not None else [],
        "connections": connections if connections is not None else [],
    }


def _minimal_architecture_nodes(
    *,
    nodes: list[object] | None = None,
    connections: list[object] | None = None,
) -> dict[str, object]:
    return {
        "nodes": nodes if nodes is not None else [],
        "connections": connections if connections is not None else [],
    }


def _make_container_block(
    container_block_id: str = "cb-1",
    container_layer: str = "region",
    **overrides: object,
) -> dict[str, object]:
    base: dict[str, object] = {
        "id": container_block_id,
        "name": "Test Container Block",
        "type": container_layer,
        "parentId": None,
        "children": [],
        "position": {"x": 0, "y": 0, "z": 0},
        "size": {"width": 20, "height": 1, "depth": 15},
    }
    base.update(overrides)
    return base


def _make_block(
    block_id: str = "block-1",
    placement_id: str = "cb-1",
    **overrides: object,
) -> dict[str, object]:
    base: dict[str, object] = {
        "id": block_id,
        "name": "Test Block",
        "category": "compute",
        "placementId": placement_id,
        "position": {"x": 2, "y": 0, "z": 2},
        "provider": "aws",
        "subtype": "ec2",
    }
    base.update(overrides)
    return base


def _make_connection(
    conn_id: str = "conn-1",
    source_id: str = "block-1",
    target_id: str = "block-2",
    conn_type: str = "http",
) -> dict[str, object]:
    return {
        "id": conn_id,
        "sourceId": source_id,
        "targetId": target_id,
        "type": conn_type,
    }


class TestValidArchitecture:
    def test_empty_architecture(self, validator: ArchitectureValidator) -> None:
        result = validator.validate(_minimal_architecture())
        assert result == []

    def test_valid_three_tier(self, validator: ArchitectureValidator) -> None:
        arch = _minimal_architecture(
            container_blocks=[_make_container_block("cb-1", "region")],
            blocks=[
                _make_block("block-1", "cb-1"),
                _make_block("block-2", "cb-1", category="database", subtype="rds-postgres"),
            ],
            connections=[_make_connection("conn-1", "block-1", "block-2", "data")],
        )
        assert validator.validate(arch) == []

    def test_valid_nodes_format(self, validator: ArchitectureValidator) -> None:
        arch = _minimal_architecture_nodes(
            nodes=[
                _make_container_block("cb-1", "region", kind="container"),
                _make_block("block-1", "cb-1", kind="resource", parentId="cb-1"),
                _make_block(
                    "block-2",
                    "cb-1",
                    kind="resource",
                    category="database",
                    subtype="rds-postgres",
                    parentId="cb-1",
                ),
            ],
            connections=[_make_connection("conn-1", "block-1", "block-2", "data")],
        )
        assert validator.validate(arch) == []


class TestMissingTopLevelKeys:
    def test_missing_plates(self, validator: ArchitectureValidator) -> None:
        result = validator.validate({"blocks": [], "connections": []})
        assert any("plates" in w for w in result)

    def test_missing_blocks(self, validator: ArchitectureValidator) -> None:
        result = validator.validate({"plates": [], "connections": []})
        assert any("blocks" in w for w in result)

    def test_missing_connections(self, validator: ArchitectureValidator) -> None:
        result = validator.validate({"plates": [], "blocks": []})
        assert any("connections" in w for w in result)

    def test_invalid_type_for_plates(self, validator: ArchitectureValidator) -> None:
        result = validator.validate({"plates": "wrong", "blocks": [], "connections": []})
        assert any("plates" in w for w in result)


class TestContainerBlockValidation:
    def test_invalid_container_layer(self, validator: ArchitectureValidator) -> None:
        container_block = _make_container_block(container_layer="datacenter")
        result = validator.validate(_minimal_architecture(container_blocks=[container_block]))
        assert any("invalid type" in w for w in result)

    def test_missing_plate_id(self, validator: ArchitectureValidator) -> None:
        container_block = _make_container_block()
        del container_block["id"]
        result = validator.validate(_minimal_architecture(container_blocks=[container_block]))
        assert any("missing or invalid 'id'" in w for w in result)

    def test_invalid_children_type(self, validator: ArchitectureValidator) -> None:
        container_block = _make_container_block(children="not-a-list")
        result = validator.validate(_minimal_architecture(container_blocks=[container_block]))
        assert any("children" in w and "array" in w for w in result)

    def test_non_dict_container_block(self, validator: ArchitectureValidator) -> None:
        result = validator.validate(_minimal_architecture(container_blocks=["not-a-dict"]))
        assert any("not a valid object" in w for w in result)


class TestBlockValidation:
    def test_invalid_category(self, validator: ArchitectureValidator) -> None:
        block = _make_block(category="networking")
        result = validator.validate(
            _minimal_architecture(container_blocks=[_make_container_block()], blocks=[block])
        )
        assert any("invalid category" in w for w in result)

    def test_invalid_provider(self, validator: ArchitectureValidator) -> None:
        block = _make_block(provider="digitalocean")
        result = validator.validate(
            _minimal_architecture(container_blocks=[_make_container_block()], blocks=[block])
        )
        assert any("invalid provider" in w for w in result)

    def test_invalid_subtype(self, validator: ArchitectureValidator) -> None:
        block = _make_block(subtype="kubernetes")
        result = validator.validate(
            _minimal_architecture(container_blocks=[_make_container_block()], blocks=[block])
        )
        assert any("invalid subtype" in w for w in result)

    def test_missing_placement_id(self, validator: ArchitectureValidator) -> None:
        block = _make_block()
        del block["placementId"]
        result = validator.validate(
            _minimal_architecture(container_blocks=[_make_container_block()], blocks=[block])
        )
        assert any("placementId" in w for w in result)

    def test_dangling_placement_id(self, validator: ArchitectureValidator) -> None:
        block = _make_block(placement_id="nonexistent")
        result = validator.validate(
            _minimal_architecture(container_blocks=[_make_container_block()], blocks=[block])
        )
        assert any("does not reference a known container block" in w for w in result)

    def test_dangling_parent_id_in_nodes(self, validator: ArchitectureValidator) -> None:
        arch = _minimal_architecture_nodes(
            nodes=[
                _make_container_block("cb-1", "region", kind="container"),
                _make_block("block-1", "cb-1", kind="resource", parentId="nonexistent"),
            ]
        )
        result = validator.validate(arch)
        assert any("does not reference a known container block" in w for w in result)

    def test_non_dict_block(self, validator: ArchitectureValidator) -> None:
        result = validator.validate(
            _minimal_architecture(container_blocks=[_make_container_block()], blocks=[42])
        )
        assert any("not a valid object" in w for w in result)


class TestConnectionValidation:
    def test_invalid_connection_type(self, validator: ArchitectureValidator) -> None:
        arch = _minimal_architecture(
            container_blocks=[_make_container_block()],
            blocks=[
                _make_block("block-1"),
                _make_block("block-2"),
            ],
            connections=[_make_connection(conn_type="websocket")],
        )
        result = validator.validate(arch)
        assert any("invalid type" in w for w in result)

    def test_dangling_source_id(self, validator: ArchitectureValidator) -> None:
        arch = _minimal_architecture(
            container_blocks=[_make_container_block()],
            blocks=[_make_block("block-2")],
            connections=[_make_connection(source_id="missing", target_id="block-2")],
        )
        result = validator.validate(arch)
        assert any("sourceId" in w and "does not reference" in w for w in result)

    def test_dangling_target_id(self, validator: ArchitectureValidator) -> None:
        arch = _minimal_architecture(
            container_blocks=[_make_container_block()],
            blocks=[_make_block("block-1")],
            connections=[_make_connection(source_id="block-1", target_id="missing")],
        )
        result = validator.validate(arch)
        assert any("targetId" in w and "does not reference" in w for w in result)

    def test_self_connection(self, validator: ArchitectureValidator) -> None:
        arch = _minimal_architecture(
            container_blocks=[_make_container_block()],
            blocks=[_make_block("block-1")],
            connections=[_make_connection(source_id="block-1", target_id="block-1")],
        )
        result = validator.validate(arch)
        assert any("self-connection" in w for w in result)

    def test_missing_source_id(self, validator: ArchitectureValidator) -> None:
        conn: dict[str, object] = {
            "id": "conn-1",
            "targetId": "block-1",
            "type": "http",
        }
        arch = _minimal_architecture(
            container_blocks=[_make_container_block()],
            blocks=[_make_block("block-1")],
            connections=[conn],
        )
        result = validator.validate(arch)
        assert any("missing 'sourceId'" in w for w in result)

    def test_non_dict_connection(self, validator: ArchitectureValidator) -> None:
        result = validator.validate(
            _minimal_architecture(container_blocks=[_make_container_block()], connections=["bad"])
        )
        assert any("not a valid object" in w for w in result)


class TestDuplicateIds:
    def test_duplicate_container_block_ids(self, validator: ArchitectureValidator) -> None:
        arch = _minimal_architecture(
            container_blocks=[_make_container_block("cb-1"), _make_container_block("cb-1")],
        )
        result = validator.validate(arch)
        assert any("Duplicate id" in w for w in result)

    def test_duplicate_across_types(self, validator: ArchitectureValidator) -> None:
        arch = _minimal_architecture(
            container_blocks=[_make_container_block("shared-id")],
            blocks=[_make_block("shared-id", "shared-id")],
        )
        result = validator.validate(arch)
        assert any("Duplicate id" in w for w in result)
