// CloudBlocks Schema — Core model types
// These interfaces define the ArchitectureModel JSON wire format.

import type {
  AggregationMode,
  BlockRole,
  ConnectionType,
  EndpointDirection,
  EndpointSemantic,
  LayerType,
  NodeKind,
  ProviderType,
  ResourceCategory,
} from './enums.js';
import type { Position, Size } from './spatial.js';
import type { CanvasTier, ContainerCapableResourceType } from './rules.js';

/**
 * Aggregation descriptor for node instances (v2.0 §8).
 */
export interface Aggregation {
  mode: AggregationMode;
  /** Must be >= 1 */
  count: number;
}

// ---------------------------------------------------------------------------
// ResourceNode — Unified model replacing Plate + Block
// ---------------------------------------------------------------------------

/**
 * Shared fields for every node in the architecture graph.
 *
 * Every node has a layer (for hierarchy rules), a category (for grouping),
 * a kind (container vs resource), and a resourceType (specific resource).
 */
interface NodeBase {
  id: string;
  name: string;
  kind: NodeKind;
  /** Hierarchy layer — used for containment validation */
  layer: LayerType;
  /** Specific resource identifier, e.g. 'virtual_network', 'web_compute', 'relational_database' */
  resourceType: string;
  /** One of the 7 resource categories */
  category: ResourceCategory;
  provider: ProviderType;
  /** Parent node ID. null for root-level nodes. */
  parentId: string | null;
  position: Position;
  metadata: Record<string, unknown>;
  /** Provider-specific configuration */
  config?: Record<string, unknown>;
  /** Resource subtype (e.g. 'linux' for compute, 'postgresql' for data) */
  subtype?: string;
  /** v2.0 §8 — multiple identical resources */
  aggregation?: Aggregation;
  /** v2.0 §9 — visual-only role indicators */
  roles?: BlockRole[];
  /** Visual profile preset identifier (frontend concern, serialized for persistence) */
  profileId?: string;
  /**
   * Canvas structural tier — orthogonal to category (domain) and layer (hierarchy).
   * Determines visual grouping on the canvas: shared, web, app, data.
   * Optional during migration; defaults derived from RESOURCE_RULES.
   */
  canvasTier?: CanvasTier;
}

/**
 * A container node holds child nodes (VNet, Subnet, Resource Group, etc.).
 * Containers have a size for visual rendering and can nest other containers
 * or leaf resources.
 */
export interface ContainerNode extends NodeBase {
  kind: 'container';
  /** Only container-capable resource types (virtual_network, subnet) */
  resourceType: ContainerCapableResourceType;
  size: Size;
}

/**
 * A leaf resource node (VM, SQL Database, Redis Cache, etc.).
 * Cannot contain children.
 */
export interface LeafNode extends NodeBase {
  kind: 'resource';
}

/**
 * Discriminated union of all node types in the architecture.
 * Discriminant: `kind` field ('container' | 'resource').
 */
export type ResourceNode = ContainerNode | LeafNode;

/**
 * An Endpoint is a typed connection point on a node.
 * Every node auto-generates 6 endpoints (3 semantics × 2 directions).
 * Deterministic ID format: `endpoint-${nodeId}-${direction}-${semantic}`
 */
export interface Endpoint {
  id: string;
  nodeId: string;
  direction: EndpointDirection;
  semantic: EndpointSemantic;
}

/**
 * A connection between two endpoints (output → input).
 * Both `from` and `to` must reference valid Endpoint IDs.
 */
export interface Connection {
  id: string;
  /** Endpoint ID (must be output direction) */
  from: string;
  /** Endpoint ID (must be input direction) */
  to: string;
  metadata: Record<string, unknown>;
}

/** @deprecated v3 Connection shape — kept for migration only. */
export interface LegacyConnection {
  id: string;
  sourceId: string;
  targetId: string;
  type: ConnectionType;
  metadata: Record<string, unknown>;
  sourceStub?: number;
  targetStub?: number;
}

/**
 * An external actor represents an entity outside the architecture
 * that initiates or receives connections (e.g., "Internet").
 */
/** @deprecated ExternalActors are folded into nodes in v4. Kept for v3→v4 migration. */
export interface ExternalActor {
  id: string;
  name: string;
  type: 'internet';
  position: Position;
}

/**
 * The root ArchitectureModel — the single most important type.
 * This is the canonical JSON wire format exchanged between
 * frontend persistence, backend validation, and code generation.
 */
export interface ArchitectureModel {
  id: string;
  name: string;
  /** User-facing architecture revision (not schema version) */
  version: string;
  /** All nodes — containers and resources in a flat array */
  nodes: ResourceNode[];
  endpoints: Endpoint[];
  connections: Connection[];
  /** @deprecated Folded into nodes in v4. Kept for v3→v4 migration loading. */
  externalActors?: ExternalActor[];
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Deprecated aliases — kept temporarily for migration, will be removed post-M19
// ---------------------------------------------------------------------------

/** @deprecated Use ContainerNode instead. */
export type Plate = ContainerNode;

/** @deprecated Use LeafNode instead. */
export type Block = LeafNode;
