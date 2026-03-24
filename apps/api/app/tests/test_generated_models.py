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
    BlockRole,
    CanvasTier,
    Connection,
    ContainerBlock,
    Endpoint,
    EndpointDirection,
    EndpointSemantic,
    ExternalActor,
    LayerType,
    Position,
    ProviderType,
    ResourceBlock,
    ResourceCategory,
    Size,
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
        "ContainerBlock",
        "ResourceBlock",
        "Block",
        "Connection",
        "Endpoint",
        "EndpointDirection",
        "EndpointSemantic",
        "ExternalActor",
        "LayerType",
        "ResourceCategory",
        "ProviderType",
        "AggregationMode",
        "BlockRole",
        "CanvasTier",
        "Position",
        "Size",
        "Aggregation",
    }

    for symbol in expected_symbols:
        assert hasattr(architecture_model, symbol)


def test_architecture_model_round_trip_serialization() -> None:
    container = ContainerBlock(
        id="node-vnet",
        name="Main VNet",
        kind="container",
        layer=LayerType.region,
        resourceType="virtual_network",
        category=ResourceCategory.network,
        provider=ProviderType.azure,
        parentId=None,
        position=Position(x=0, y=0, z=0),
        frame=Size(width=100, height=20, depth=100),
        metadata={},
        profileId=None,
    )

    leaf = ResourceBlock(
        id="node-vm",
        name="Web VM",
        kind="resource",
        layer=LayerType.resource,
        resourceType="vm",
        category=ResourceCategory.compute,
        provider=ProviderType.azure,
        parentId="node-vnet",
        position=Position(x=10, y=10, z=1),
        metadata={"tier": "web"},
        aggregation=Aggregation(mode=AggregationMode.single, count=1),
        roles=[BlockRole.public],
    )

    architecture = ArchitectureModel(
        id="arch-1",
        name="Demo",
        version="v1",
        nodes=[
            Block(root=container),
            Block(root=leaf),
        ],
        endpoints=[
            Endpoint(
                id="node-vm:output:http",
                blockId="node-vm",
                direction=EndpointDirection.output,
                semantic=EndpointSemantic.http,
            ),
        ],
        connections=[
            Connection(
                id="conn-1",
                **{"from": "actor-1:output:http"},
                to="node-vm:input:http",
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

    payload = architecture.model_dump(by_alias=True)
    reloaded = ArchitectureModel.model_validate(payload)

    assert reloaded == architecture


def test_generated_enum_values_match_json_schema() -> None:
    schema = _load_schema()
    definitions = schema["definitions"]

    enum_map = {
        "LayerType": LayerType,
        "ResourceCategory": ResourceCategory,
        "ProviderType": ProviderType,
        "AggregationMode": AggregationMode,
        "BlockRole": BlockRole,
        "CanvasTier": CanvasTier,
        "EndpointDirection": EndpointDirection,
        "EndpointSemantic": EndpointSemantic,
    }

    for schema_name, enum_class in enum_map.items():
        enum_definition = definitions[schema_name]
        schema_values = enum_definition["enum"]
        generated_values = [member.value for member in enum_class]
        assert generated_values == schema_values
