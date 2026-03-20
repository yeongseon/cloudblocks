# AUTO-GENERATED from packages/schema/dist/architecture-model.schema.json
# DO NOT EDIT - re-run scripts/generate_models.py to update
# pyright: reportUnannotatedClassAttribute=false, reportExplicitAny=false

from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, RootModel


class PlateType(Enum):
    global_ = 'global'
    edge = 'edge'
    region = 'region'
    zone = 'zone'
    subnet = 'subnet'


class SubnetAccess(Enum):
    public = 'public'
    private = 'private'


class Position(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    x: float
    y: float
    z: float


class Size(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    width: float
    height: float
    depth: float


class BlockCategory(Enum):
    compute = 'compute'
    database = 'database'
    storage = 'storage'
    gateway = 'gateway'
    function = 'function'
    queue = 'queue'
    event = 'event'
    analytics = 'analytics'
    identity = 'identity'
    observability = 'observability'


class ProviderType(Enum):
    azure = 'azure'
    aws = 'aws'
    gcp = 'gcp'


class AggregationMode(Enum):
    single = 'single'
    count = 'count'


class BlockRole(Enum):
    primary = 'primary'
    secondary = 'secondary'
    reader = 'reader'
    writer = 'writer'
    public = 'public'
    private = 'private'
    internal = 'internal'
    external = 'external'


class ConnectionType(Enum):
    dataflow = 'dataflow'
    http = 'http'
    internal = 'internal'
    data = 'data'
    async_ = 'async'


class ExternalActor(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    id: str
    name: str
    type: Literal['internet']
    position: Position


class Plate(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    id: str
    name: str
    type: PlateType
    subnetAccess: SubnetAccess | None = Field(None, description='Only for subnet type')
    profileId: str | None = Field(
        None,
        description='Profile preset identifier (frontend concern, but part of the serialized model)',
    )
    parentId: str | None = Field(..., description='null for root plate')
    children: list[str] = Field(
        ...,
        description='Mixed list: child plate IDs + block IDs. (Intentional for MVP; consider splitting to childPlateIds/childBlockIds in v1.0)',
    )
    position: Position
    size: Size
    metadata: dict[str, Any]


class Aggregation(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    mode: AggregationMode
    count: float = Field(..., description='Must be >= 1')


class Connection(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    id: str
    sourceId: str = Field(..., description='Block or external actor ID (initiator)')
    targetId: str = Field(..., description='Block or external actor ID (receiver)')
    type: ConnectionType
    metadata: dict[str, Any]


class Block(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    id: str
    name: str
    category: BlockCategory
    placementId: str = Field(..., description='Parent plate ID')
    position: Position = Field(..., description='Position relative to parent plate')
    metadata: dict[str, Any]
    provider: ProviderType | None = None
    subtype: str | None = None
    config: dict[str, Any] | None = None
    aggregation: Aggregation | None = Field(
        None, description='v2.0 §8 — multiple identical resources'
    )
    roles: list[BlockRole] | None = Field(
        None, description='v2.0 §9 — visual-only role indicators'
    )


class ArchitectureModel(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    id: str
    name: str
    version: str = Field(
        ..., description='User-facing architecture revision (not schema version)'
    )
    plates: list[Plate]
    blocks: list[Block]
    connections: list[Connection]
    externalActors: list[ExternalActor]
    createdAt: str = Field(..., description='ISO 8601')
    updatedAt: str = Field(..., description='ISO 8601')


class Model(RootModel[ArchitectureModel]):
    root: ArchitectureModel
