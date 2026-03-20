from __future__ import annotations

import pytest

from app.engines.validation import ArchitectureValidator


@pytest.fixture
def validator() -> ArchitectureValidator:
    return ArchitectureValidator()


def _minimal_architecture(
    *,
    plates: list[dict[str, object]] | None = None,
    blocks: list[dict[str, object]] | None = None,
    connections: list[dict[str, object]] | None = None,
) -> dict[str, object]:
    return {
        "plates": plates if plates is not None else [],
        "blocks": blocks if blocks is not None else [],
        "connections": connections if connections is not None else [],
    }


def _make_plate(
    plate_id: str = "plate-1",
    plate_type: str = "region",
    **overrides: object,
) -> dict[str, object]:
    base: dict[str, object] = {
        "id": plate_id,
        "name": "Test Plate",
        "type": plate_type,
        "parentId": None,
        "children": [],
        "position": {"x": 0, "y": 0, "z": 0},
        "size": {"width": 20, "height": 1, "depth": 15},
    }
    base.update(overrides)
    return base


def _make_block(
    block_id: str = "block-1",
    placement_id: str = "plate-1",
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
            plates=[_make_plate("plate-1", "region")],
            blocks=[
                _make_block("block-1", "plate-1"),
                _make_block("block-2", "plate-1", category="database", subtype="rds-postgres"),
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


class TestPlateValidation:
    def test_invalid_plate_type(self, validator: ArchitectureValidator) -> None:
        plate = _make_plate(plate_type="datacenter")
        result = validator.validate(_minimal_architecture(plates=[plate]))
        assert any("invalid type" in w for w in result)

    def test_missing_plate_id(self, validator: ArchitectureValidator) -> None:
        plate = _make_plate()
        del plate["id"]
        result = validator.validate(_minimal_architecture(plates=[plate]))
        assert any("missing or invalid 'id'" in w for w in result)

    def test_invalid_children_type(self, validator: ArchitectureValidator) -> None:
        plate = _make_plate(children="not-a-list")
        result = validator.validate(_minimal_architecture(plates=[plate]))
        assert any("children" in w and "array" in w for w in result)

    def test_non_dict_plate(self, validator: ArchitectureValidator) -> None:
        result = validator.validate(_minimal_architecture(plates=["not-a-dict"]))
        assert any("not a valid object" in w for w in result)


class TestBlockValidation:
    def test_invalid_category(self, validator: ArchitectureValidator) -> None:
        block = _make_block(category="networking")
        result = validator.validate(_minimal_architecture(plates=[_make_plate()], blocks=[block]))
        assert any("invalid category" in w for w in result)

    def test_invalid_provider(self, validator: ArchitectureValidator) -> None:
        block = _make_block(provider="digitalocean")
        result = validator.validate(_minimal_architecture(plates=[_make_plate()], blocks=[block]))
        assert any("invalid provider" in w for w in result)

    def test_invalid_subtype(self, validator: ArchitectureValidator) -> None:
        block = _make_block(subtype="kubernetes")
        result = validator.validate(_minimal_architecture(plates=[_make_plate()], blocks=[block]))
        assert any("invalid subtype" in w for w in result)

    def test_missing_placement_id(self, validator: ArchitectureValidator) -> None:
        block = _make_block()
        del block["placementId"]
        result = validator.validate(_minimal_architecture(plates=[_make_plate()], blocks=[block]))
        assert any("placementId" in w for w in result)

    def test_dangling_placement_id(self, validator: ArchitectureValidator) -> None:
        block = _make_block(placement_id="nonexistent")
        result = validator.validate(_minimal_architecture(plates=[_make_plate()], blocks=[block]))
        assert any("does not reference a known plate" in w for w in result)

    def test_non_dict_block(self, validator: ArchitectureValidator) -> None:
        result = validator.validate(_minimal_architecture(plates=[_make_plate()], blocks=[42]))
        assert any("not a valid object" in w for w in result)


class TestConnectionValidation:
    def test_invalid_connection_type(self, validator: ArchitectureValidator) -> None:
        arch = _minimal_architecture(
            plates=[_make_plate()],
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
            plates=[_make_plate()],
            blocks=[_make_block("block-2")],
            connections=[_make_connection(source_id="missing", target_id="block-2")],
        )
        result = validator.validate(arch)
        assert any("sourceId" in w and "does not reference" in w for w in result)

    def test_dangling_target_id(self, validator: ArchitectureValidator) -> None:
        arch = _minimal_architecture(
            plates=[_make_plate()],
            blocks=[_make_block("block-1")],
            connections=[_make_connection(source_id="block-1", target_id="missing")],
        )
        result = validator.validate(arch)
        assert any("targetId" in w and "does not reference" in w for w in result)

    def test_self_connection(self, validator: ArchitectureValidator) -> None:
        arch = _minimal_architecture(
            plates=[_make_plate()],
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
            plates=[_make_plate()],
            blocks=[_make_block("block-1")],
            connections=[conn],
        )
        result = validator.validate(arch)
        assert any("missing 'sourceId'" in w for w in result)

    def test_non_dict_connection(self, validator: ArchitectureValidator) -> None:
        result = validator.validate(_minimal_architecture(connections=["bad"]))
        assert any("not a valid object" in w for w in result)


class TestDuplicateIds:
    def test_duplicate_plate_ids(self, validator: ArchitectureValidator) -> None:
        arch = _minimal_architecture(
            plates=[_make_plate("plate-1"), _make_plate("plate-1")],
        )
        result = validator.validate(arch)
        assert any("Duplicate id" in w for w in result)

    def test_duplicate_across_types(self, validator: ArchitectureValidator) -> None:
        arch = _minimal_architecture(
            plates=[_make_plate("shared-id")],
            blocks=[_make_block("shared-id", "shared-id")],
        )
        result = validator.validate(arch)
        assert any("Duplicate id" in w for w in result)
