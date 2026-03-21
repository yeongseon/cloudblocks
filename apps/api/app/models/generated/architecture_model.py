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


class ResourceCategory(Enum):
    network = 'network'
    security = 'security'
    edge = 'edge'
    compute = 'compute'
    data = 'data'
    messaging = 'messaging'
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


class SubnetAccess(Enum):
    public = 'public'
    private = 'private'


class Size(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    width: float
    height: float
    depth: float


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


class Aggregation(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    mode: AggregationMode
    count: float = Field(..., description='Must be >= 1')


class LeafNode(BaseModel):
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
        description="Specific resource identifier, e.g. 'virtual_network', 'vm', 'sql_database'",
    )
    category: ResourceCategory = Field(
        ..., description='One of the 7 resource categories'
    )
    provider: ProviderType
    parentId: str | None = Field(
        ..., description='Parent node ID. null for root-level nodes.'
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
    subnetAccess: SubnetAccess | None = Field(
        None,
        description='Subnet access visibility — only meaningful for subnet-layer containers',
    )
    profileId: str | None = Field(
        None,
        description='Visual profile preset identifier (frontend concern, serialized for persistence)',
    )


class Connection(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    id: str
    sourceId: str = Field(
        ..., description='ResourceNode or ExternalActor ID (initiator)'
    )
    targetId: str = Field(
        ..., description='ResourceNode or ExternalActor ID (receiver)'
    )
    type: ConnectionType
    metadata: dict[str, Any]


class ContainerNode(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    id: str
    name: str
    kind: Literal['container']
    layer: LayerType = Field(
        ..., description='Hierarchy layer — used for containment validation'
    )
    resourceType: str = Field(
        ...,
        description="Specific resource identifier, e.g. 'virtual_network', 'vm', 'sql_database'",
    )
    category: ResourceCategory = Field(
        ..., description='One of the 7 resource categories'
    )
    provider: ProviderType
    parentId: str | None = Field(
        ..., description='Parent node ID. null for root-level nodes.'
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
    subnetAccess: SubnetAccess | None = Field(
        None,
        description='Subnet access visibility — only meaningful for subnet-layer containers',
    )
    profileId: str | None = Field(
        None,
        description='Visual profile preset identifier (frontend concern, serialized for persistence)',
    )
    size: Size


class ResourceNode(RootModel[ContainerNode | LeafNode]):
    root: ContainerNode | LeafNode = Field(
        ...,
        description="Discriminated union of all node types in the architecture. Discriminant: `kind` field ('container' | 'resource').",
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
    nodes: list[ResourceNode] = Field(
        ..., description='All nodes — containers and resources in a flat array'
    )
    connections: list[Connection]
    externalActors: list[ExternalActor]
    createdAt: str = Field(..., description='ISO 8601')
    updatedAt: str = Field(..., description='ISO 8601')


class Model(RootModel[ArchitectureModel]):
    root: ArchitectureModel
