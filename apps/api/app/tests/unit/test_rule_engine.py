from __future__ import annotations

from collections.abc import Callable
from typing import Any, cast

import pytest

from app.engines import rule_engine

Json = dict[str, Any]

validate_placement = cast(
    Callable[[Json, Json | None], Json | None],
    rule_engine._validate_placement,
)
validate_connection = cast(
    Callable[[Json, list[Json], list[Json]], Json | None],
    rule_engine._validate_connection,
)
get_endpoint_type = cast(
    Callable[[str, list[Json], list[Json]], str | None],
    rule_engine._get_endpoint_type,
)


def _plate(plate_id: str, plate_type: str, subnet_access: str | None = None) -> Json:
    data: Json = {"id": plate_id, "type": plate_type}
    if subnet_access is not None:
        data["subnetAccess"] = subnet_access
    return data


def _block(block_id: str, category: str, placement_id: str, name: str = "Block") -> Json:
    return {
        "id": block_id,
        "name": name,
        "category": category,
        "placementId": placement_id,
    }


def _conn(conn_id: str, source_id: str, target_id: str) -> Json:
    return {"id": conn_id, "sourceId": source_id, "targetId": target_id}


def _endpoint(endpoint_id: str, category: str) -> Json:
    return {"id": endpoint_id, "category": category}


def _actor(actor_id: str, actor_type: str) -> Json:
    return {"id": actor_id, "type": actor_type}


def test_validate_architecture_empty_architecture_is_valid() -> None:
    result = rule_engine.validate_architecture({})

    assert result == {"valid": True, "errors": [], "warnings": []}


def test_validate_placement_block_without_plate_returns_error() -> None:
    block = _block("b1", "compute", "missing", name="API")

    error = validate_placement(block, None)

    assert error is not None
    assert error["ruleId"] == "rule-plate-exists"
    assert error["severity"] == "error"
    assert error["targetId"] == "b1"


def test_validate_placement_compute_on_subnet_is_valid() -> None:
    block = _block("b1", "compute", "p-subnet", name="Compute")
    plate = _plate("p-subnet", "subnet", "private")

    assert validate_placement(block, plate) is None


def test_validate_placement_compute_on_network_plate_is_error() -> None:
    block = _block("b1", "compute", "p-network", name="Compute")
    plate = _plate("p-network", "network")

    error = validate_placement(block, plate)

    assert error is not None
    assert error["ruleId"] == "rule-compute-subnet"
    assert "must be placed on a Subnet Plate" in error["message"]


def test_validate_placement_database_on_private_subnet_is_valid() -> None:
    block = _block("b-db", "database", "p-private", name="DB")
    plate = _plate("p-private", "subnet", "private")

    assert validate_placement(block, plate) is None


def test_validate_placement_database_on_public_subnet_is_error() -> None:
    block = _block("b-db", "database", "p-public", name="DB")
    plate = _plate("p-public", "subnet", "public")

    error = validate_placement(block, plate)

    assert error is not None
    assert error["ruleId"] == "rule-db-private"
    assert "private Subnet Plate" in error["message"]


def test_validate_placement_gateway_on_public_subnet_is_valid() -> None:
    block = _block("b-gw", "gateway", "p-public", name="GW")
    plate = _plate("p-public", "subnet", "public")

    assert validate_placement(block, plate) is None


def test_validate_placement_gateway_on_private_subnet_is_error() -> None:
    block = _block("b-gw", "gateway", "p-private", name="GW")
    plate = _plate("p-private", "subnet", "private")

    error = validate_placement(block, plate)

    assert error is not None
    assert error["ruleId"] == "rule-gw-public"
    assert "public Subnet Plate" in error["message"]


def test_validate_placement_storage_on_subnet_is_valid() -> None:
    block = _block("b-st", "storage", "p-subnet", name="Storage")
    plate = _plate("p-subnet", "subnet", "private")

    assert validate_placement(block, plate) is None


def test_validate_placement_unknown_category_is_ignored() -> None:
    block = _block("b-x", "cache", "p-subnet", name="Cache")
    plate = _plate("p-subnet", "subnet", "private")

    assert validate_placement(block, plate) is None


def test_validate_connection_allowed_routes_are_valid() -> None:
    blocks = [
        {"id": "gw", "category": "gateway"},
        {"id": "cmp", "category": "compute"},
        {"id": "db", "category": "database"},
        {"id": "st", "category": "storage"},
    ]
    external_actors = [{"id": "net", "type": "internet"}]

    assert validate_connection(_conn("c1", "net", "gw"), blocks, external_actors) is None
    assert validate_connection(_conn("c2", "gw", "cmp"), blocks, external_actors) is None
    assert validate_connection(_conn("c3", "cmp", "db"), blocks, external_actors) is None
    assert validate_connection(_conn("c4", "cmp", "st"), blocks, external_actors) is None


def test_validate_connection_invalid_pairs_return_error() -> None:
    blocks = [
        {"id": "gw", "category": "gateway"},
        {"id": "cmp", "category": "compute"},
        {"id": "db", "category": "database"},
    ]
    external_actors = [{"id": "net", "type": "internet"}]

    err_a = validate_connection(_conn("c1", "net", "cmp"), blocks, external_actors)
    err_b = validate_connection(_conn("c2", "gw", "db"), blocks, external_actors)

    assert err_a is not None
    assert err_a["ruleId"] == "rule-conn-invalid"
    assert "internet" in err_a["message"]
    assert "compute" in err_a["message"]

    assert err_b is not None
    assert err_b["ruleId"] == "rule-conn-invalid"
    assert "gateway" in err_b["message"]
    assert "database" in err_b["message"]


def test_validate_connection_self_connection_returns_error() -> None:
    blocks = [{"id": "cmp", "category": "compute"}]

    err = validate_connection(_conn("c1", "cmp", "cmp"), blocks, [])

    assert err is not None
    assert err["ruleId"] == "rule-conn-self"
    assert err["message"] == "A block cannot connect to itself"


def test_validate_connection_missing_endpoint_returns_error() -> None:
    blocks = [{"id": "cmp", "category": "compute"}]

    err = validate_connection(_conn("c1", "missing", "cmp"), blocks, [])

    assert err is not None
    assert err["ruleId"] == "rule-conn-endpoint"
    assert err["message"] == "Connection references a missing endpoint"


def test_get_endpoint_type_for_block_actor_and_missing() -> None:
    blocks = [{"id": "cmp", "category": "compute"}]
    actors = [{"id": "ext", "type": "internet"}]

    assert get_endpoint_type("cmp", blocks, actors) == "compute"
    assert get_endpoint_type("ext", blocks, actors) == "internet"
    assert get_endpoint_type("unknown", blocks, actors) is None


def test_validate_architecture_integration_mixed_valid_and_invalid() -> None:
    architecture = {
        "plates": [
            _plate("p-public", "subnet", "public"),
            _plate("p-private", "subnet", "private"),
            _plate("p-network", "network"),
        ],
        "blocks": [
            _block("gw", "gateway", "p-public", name="Gateway"),
            _block("cmp", "compute", "p-private", name="Compute"),
            _block("db", "database", "p-public", name="Database"),
            _block("st", "storage", "p-private", name="Storage"),
            _block("orphan", "compute", "missing", name="Orphan"),
        ],
        "externalActors": [{"id": "internet", "type": "internet"}],
        "connections": [
            _conn("ok-1", "internet", "gw"),
            _conn("ok-2", "gw", "cmp"),
            _conn("bad-1", "internet", "cmp"),
            _conn("bad-2", "cmp", "cmp"),
            _conn("bad-3", "gw", "missing"),
        ],
    }

    result = rule_engine.validate_architecture(architecture)

    assert result["valid"] is False
    assert result["warnings"] == []
    errors = cast(list[Json], result["errors"])
    rule_ids = {cast(str, err["ruleId"]) for err in errors}
    assert "rule-db-private" in rule_ids
    assert "rule-plate-exists" in rule_ids
    assert "rule-conn-invalid" in rule_ids
    assert "rule-conn-self" in rule_ids
    assert "rule-conn-endpoint" in rule_ids


def test_validate_architecture_collects_warnings_branch(monkeypatch: pytest.MonkeyPatch) -> None:
    def placement_warning(_block: Json, _plate: Json | None) -> Json:
        return {
            "ruleId": "warning-placement",
            "severity": "warning",
            "message": "placement warning",
            "targetId": "b1",
        }

    def connection_warning(_connection: Json, _blocks: list[Json], _actors: list[Json]) -> Json:
        return {
            "ruleId": "warning-connection",
            "severity": "warning",
            "message": "connection warning",
            "targetId": "c1",
        }

    monkeypatch.setattr(rule_engine, "_validate_placement", placement_warning)
    monkeypatch.setattr(rule_engine, "_validate_connection", connection_warning)

    result = rule_engine.validate_architecture(
        {
            "plates": [{"id": "p1", "type": "subnet"}],
            "blocks": [{"id": "b1", "name": "B", "placementId": "p1", "category": "compute"}],
            "connections": [{"id": "c1", "sourceId": "b1", "targetId": "b2"}],
            "externalActors": [],
        }
    )

    assert result["valid"] is True
    assert result["errors"] == []
    warnings = cast(list[Json], result["warnings"])
    assert len(warnings) == 2
