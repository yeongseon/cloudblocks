# AUTO-GENERATED from packages/schema/dist/architecture-model.schema.json
# DO NOT EDIT - re-run scripts/generate_models.py to update
# pyright: reportUnannotatedClassAttribute=false, reportExplicitAny=false

from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, RootModel


class LayerType(Enum):
    global_ = 'global'
    edge = 'edge'
    region = 'region'
    zone = 'zone'
    subnet = 'subnet'
    resource = 'resource'


class ContainerCapableResourceType(Enum):
    virtual_network = 'virtual_network'
    subnet = 'subnet'


class ResourceCategory(Enum):
    network = 'network'
    delivery = 'delivery'
    compute = 'compute'
    data = 'data'
    messaging = 'messaging'
    security = 'security'
    identity = 'identity'
    operations = 'operations'


class ProviderType(Enum):
    azure = 'azure'
    aws = 'aws'
    gcp = 'gcp'


class Position(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    x: float
    y: float
    z: float


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


class CanvasTier(Enum):
    shared = 'shared'
    web = 'web'
    app = 'app'
    data = 'data'


class Size(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    width: float
    height: float
    depth: float


class EndpointDirection(Enum):
    input = 'input'
    output = 'output'


class EndpointSemantic(Enum):
    http = 'http'
    event = 'event'
    data = 'data'


class Connection(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    id: str
    from_: str = Field(
        ..., alias='from', description='Endpoint ID (must be output direction)'
    )
    to: str = Field(..., description='Endpoint ID (must be input direction)')
    metadata: dict[str, Any]


class Type(Enum):
    internet = 'internet'
    browser = 'browser'


class ExternalActor(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    id: str
    name: str
    type: Type
    position: Position


class Aggregation(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    mode: AggregationMode
    count: float = Field(..., description='Must be >= 1')


class ResourceBlock(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    id: str
    name: str
    kind: Literal['resource']
    layer: LayerType = Field(
        ..., description='Hierarchy layer — used for containment validation'
    )
    resourceType: str = Field(
        ...,
        description="Specific resource identifier, e.g. 'virtual_network', 'web_compute', 'relational_database'",
    )
    category: ResourceCategory = Field(
        ..., description='One of the 8 resource categories'
    )
    provider: ProviderType
    parentId: str | None = Field(
        ..., description='Parent block ID. null for root-level blocks.'
    )
    position: Position
    metadata: dict[str, Any]
    config: dict[str, Any] | None = Field(
        None, description='Provider-specific configuration'
    )
    subtype: str | None = Field(
        None,
        description="Resource subtype (e.g. 'linux' for compute, 'postgresql' for data)",
    )
    aggregation: Aggregation | None = Field(
        None, description='v2.0 §8 — multiple identical resources'
    )
    roles: list[BlockRole] | None = Field(
        None, description='v2.0 §9 — visual-only role indicators'
    )
    profileId: str | None = Field(
        None,
        description='Visual profile preset identifier (frontend concern, serialized for persistence)',
    )
    canvasTier: CanvasTier | None = Field(
        None,
        description='Canvas structural tier — orthogonal to category (domain) and layer (hierarchy). Determines visual grouping on the canvas: shared, web, app, data. Optional during migration; defaults derived from RESOURCE_RULES.',
    )


class Endpoint(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    id: str
    blockId: str
    direction: EndpointDirection
    semantic: EndpointSemantic


class ContainerBlock(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    id: str
    name: str
    kind: Literal['container']
    layer: LayerType = Field(
        ..., description='Hierarchy layer — used for containment validation'
    )
    resourceType: ContainerCapableResourceType = Field(
        ...,
        description='Only container-capable resource types (virtual_network, subnet)',
    )
    category: ResourceCategory = Field(
        ..., description='One of the 8 resource categories'
    )
    provider: ProviderType
    parentId: str | None = Field(
        ..., description='Parent block ID. null for root-level blocks.'
    )
    position: Position
    metadata: dict[str, Any]
    config: dict[str, Any] | None = Field(
        None, description='Provider-specific configuration'
    )
    subtype: str | None = Field(
        None,
        description="Resource subtype (e.g. 'linux' for compute, 'postgresql' for data)",
    )
    aggregation: Aggregation | None = Field(
        None, description='v2.0 §8 — multiple identical resources'
    )
    roles: list[BlockRole] | None = Field(
        None, description='v2.0 §9 — visual-only role indicators'
    )
    profileId: str | None = Field(
        None,
        description='Visual profile preset identifier (frontend concern, serialized for persistence)',
    )
    canvasTier: CanvasTier | None = Field(
        None,
        description='Canvas structural tier — orthogonal to category (domain) and layer (hierarchy). Determines visual grouping on the canvas: shared, web, app, data. Optional during migration; defaults derived from RESOURCE_RULES.',
    )
    frame: Size = Field(
        ..., description='Visual frame dimensions (width × height × depth)'
    )


class Block(RootModel[ContainerBlock | ResourceBlock]):
    root: ContainerBlock | ResourceBlock = Field(
        ...,
        description="Discriminated union of all block types in the architecture. Discriminant: `kind` field ('container' | 'resource').",
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
    nodes: list[Block] = Field(
        ..., description='All blocks — containers and resources in a flat array'
    )
    endpoints: list[Endpoint]
    connections: list[Connection]
    externalActors: list[ExternalActor] | None = Field(
        None, deprecated='Folded into blocks in v4. Kept for v3→v4 migration loading.'
    )
    createdAt: str = Field(..., description='ISO 8601')
    updatedAt: str = Field(..., description='ISO 8601')


class Model(RootModel[ArchitectureModel]):
    root: ArchitectureModel
