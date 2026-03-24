// CloudBlocks Schema — Core model types
// These interfaces define the ArchitectureModel JSON wire format.

import type {
  AggregationMode,
  BlockKind,
  BlockRole,
  ConnectionType,
  EndpointDirection,
  EndpointSemantic,
  LayerType,
  ProviderType,
  ResourceCategory,
} from './enums.js';
import type { Position, Size } from './spatial.js';
import type { CanvasTier, ContainerCapableResourceType } from './rules.js';

/**
 * Aggregation descriptor for block instances (v2.0 §8).
 */
export interface Aggregation {
  mode: AggregationMode;
  /** Must be >= 1 */
  count: number;
}

// ---------------------------------------------------------------------------
// Block — Unified model (ADR-0013)
// ---------------------------------------------------------------------------

/**
 * Shared fields for every block in the architecture graph.
 *
 * Every block has a layer (for hierarchy rules), a category (for grouping),
 * a kind (container vs resource), and a resourceType (specific resource).
 */
interface BlockBase {
  id: string;
  name: string;
  kind: BlockKind;
  /** Hierarchy layer — used for containment validation */
  layer: LayerType;
  /** Specific resource identifier, e.g. 'virtual_network', 'web_compute', 'relational_database' */
  resourceType: string;
  /** One of the 8 resource categories */
  category: ResourceCategory;
  provider: ProviderType;
  /** Parent block ID. null for root-level blocks. */
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
 * A container block holds child blocks (VNet, Subnet, Resource Group, etc.).
 * Containers have a frame (size) for visual rendering and can nest other containers
 * or resource blocks.
 */
export interface ContainerBlock extends BlockBase {
  kind: 'container';
  /** Only container-capable resource types (virtual_network, subnet) */
  resourceType: ContainerCapableResourceType;
  /** Visual frame dimensions (width × height × depth) */
  frame: Size;
}

/**
 * A resource block (VM, SQL Database, Redis Cache, etc.).
 * Cannot contain children.
 */
export interface ResourceBlock extends BlockBase {
  kind: 'resource';
}

/**
 * Discriminated union of all block types in the architecture.
 * Discriminant: `kind` field ('container' | 'resource').
 */
export type Block = ContainerBlock | ResourceBlock;

/**
 * An Endpoint is a typed connection point on a block.
 * Every block auto-generates 6 endpoints (3 semantics × 2 directions).
 * Deterministic ID format: `endpoint-${blockId}-${direction}-${semantic}`
 */
export interface Endpoint {
  id: string;
  blockId: string;
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
  sourcePort?: number;
  targetPort?: number;
}

/**
 * An external actor represents an entity outside the architecture
 * that initiates or receives connections (e.g., "Internet").
 */
/** @deprecated ExternalActors are folded into blocks in v4. Kept for v3→v4 migration. */
export interface ExternalActor {
  id: string;
  name: string;
  type: 'internet' | 'browser';
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
  /** All blocks — containers and resources in a flat array */
  nodes: Block[];
  endpoints: Endpoint[];
  connections: Connection[];
  /** @deprecated Folded into blocks in v4. Kept for v3→v4 migration loading. */
  externalActors?: ExternalActor[];
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
}
