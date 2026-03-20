// CloudBlocks Schema — Core model types
// These interfaces define the ArchitectureModel JSON wire format.

import type {
  AggregationMode,
  BlockCategory,
  BlockRole,
  ConnectionType,
  PlateType,
  ProviderType,
  SubnetAccess,
} from './enums.js';
import type { Position, Size } from './spatial.js';

/**
 * Aggregation descriptor for block instances (v2.0 §8).
 */
export interface Aggregation {
  mode: AggregationMode;
  /** Must be >= 1 */
  count: number;
}

/**
 * A plate is a logical container (VPC, resource group, subnet).
 * Plates nest hierarchically according to LayerType parentage rules.
 */
export interface Plate {
  id: string;
  name: string;
  type: PlateType;
  /** Only for subnet type */
  subnetAccess?: SubnetAccess;
  /** Profile preset identifier (frontend concern, but part of the serialized model) */
  profileId?: string;
  /** null for root plate */
  parentId: string | null;
  /**
   * Mixed list: child plate IDs + block IDs.
   * (Intentional for MVP; consider splitting to childPlateIds/childBlockIds in v1.0)
   */
  children: string[];
  position: Position;
  size: Size;
  metadata: Record<string, unknown>;
}

/**
 * A block is a cloud resource (VM, database, storage, etc.).
 * Blocks sit on plates and connect to other blocks.
 */
export interface Block {
  id: string;
  name: string;
  category: BlockCategory;
  /** Parent plate ID */
  placementId: string;
  /** Position relative to parent plate */
  position: Position;
  metadata: Record<string, unknown>;
  provider?: ProviderType;
  subtype?: string;
  config?: Record<string, unknown>;
  /** v2.0 §8 — multiple identical resources */
  aggregation?: Aggregation;
  /** v2.0 §9 — visual-only role indicators */
  roles?: BlockRole[];
}

/**
 * A typed connection between two blocks or external actors.
 * Direction represents the **initiator** of the request;
 * response flows implicitly in the reverse direction.
 */
export interface Connection {
  id: string;
  /** Block or external actor ID (initiator) */
  sourceId: string;
  /** Block or external actor ID (receiver) */
  targetId: string;
  type: ConnectionType;
  metadata: Record<string, unknown>;
}

/**
 * An external actor represents an entity outside the architecture
 * that initiates or receives connections (e.g., "Internet").
 */
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
  plates: Plate[];
  blocks: Block[];
  connections: Connection[];
  externalActors: ExternalActor[];
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
}
