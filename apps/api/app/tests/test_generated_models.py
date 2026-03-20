from __future__ import annotations

import json
from pathlib import Path
from typing import TypedDict, cast

from app.models.generated import architecture_model
from app.models.generated.architecture_model import (
    Aggregation,
    AggregationMode,
    ArchitectureModel,
    Block,
    BlockCategory,
    BlockRole,
    Connection,
    ConnectionType,
    ExternalActor,
    Plate,
    PlateType,
    Position,
    ProviderType,
    Size,
    SubnetAccess,
)

SCHEMA_PATH = (
    Path(__file__).resolve().parents[4] / "packages/schema/dist/architecture-model.schema.json"
)


class EnumDefinition(TypedDict):
    enum: list[str]


class SchemaDefinitions(TypedDict):
    definitions: dict[str, EnumDefinition]


def _load_schema() -> SchemaDefinitions:
    return cast(SchemaDefinitions, json.loads(SCHEMA_PATH.read_text(encoding="utf-8")))


def test_expected_generated_model_symbols_exist() -> None:
    expected_symbols = {
        "ArchitectureModel",
        "Plate",
        "Block",
        "Connection",
        "ExternalActor",
        "PlateType",
        "SubnetAccess",
        "BlockCategory",
        "ProviderType",
        "ConnectionType",
        "AggregationMode",
        "BlockRole",
        "Position",
        "Size",
        "Aggregation",
    }

    for symbol in expected_symbols:
        assert hasattr(architecture_model, symbol)


def test_architecture_model_round_trip_serialization() -> None:
    architecture = ArchitectureModel(
        id="arch-1",
        name="Demo",
        version="v1",
        plates=[
            Plate(
                id="plate-1",
                name="Region A",
                type=PlateType.region,
                subnetAccess=SubnetAccess.public,
                profileId=None,
                parentId=None,
                children=["block-1"],
                position=Position(x=0, y=0, z=0),
                size=Size(width=100, height=20, depth=100),
                metadata={},
            )
        ],
        blocks=[
            Block(
                id="block-1",
                name="Web",
                category=BlockCategory.compute,
                placementId="plate-1",
                position=Position(x=10, y=10, z=1),
                metadata={"tier": "web"},
                provider=ProviderType.aws,
                aggregation=Aggregation(mode=AggregationMode.single, count=1),
                roles=[BlockRole.public],
            )
        ],
        connections=[
            Connection(
                id="conn-1",
                sourceId="actor-1",
                targetId="block-1",
                type=ConnectionType.http,
                metadata={},
            )
        ],
        externalActors=[
            ExternalActor(
                id="actor-1",
                name="Internet",
                type="internet",
                position=Position(x=5, y=5, z=0),
            )
        ],
        createdAt="2026-03-20T00:00:00Z",
        updatedAt="2026-03-20T00:00:00Z",
    )

    payload = architecture.model_dump()
    reloaded = ArchitectureModel.model_validate(payload)

    assert reloaded == architecture


def test_generated_enum_values_match_json_schema() -> None:
    schema = _load_schema()
    definitions = schema["definitions"]

    enum_map = {
        "PlateType": PlateType,
        "SubnetAccess": SubnetAccess,
        "BlockCategory": BlockCategory,
        "ProviderType": ProviderType,
        "ConnectionType": ConnectionType,
        "AggregationMode": AggregationMode,
        "BlockRole": BlockRole,
    }

    for schema_name, enum_class in enum_map.items():
        enum_definition = definitions[schema_name]
        schema_values = enum_definition["enum"]
        generated_values = [member.value for member in enum_class]
        assert generated_values == schema_values
