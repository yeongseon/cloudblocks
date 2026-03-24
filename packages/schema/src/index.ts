// CloudBlocks Schema — Canonical type definitions
// Shared between frontend and backend via JSON Schema bridge.

/** Schema version for the ArchitectureModel wire format. */
export const SCHEMA_VERSION = '4.0.0';

// Enumeration types
export type {
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

// Deprecated enum aliases (migration shims — remove post-M24)
export type { PlateType } from './enums.js';

// Spatial types
export type { Position, Size } from './spatial.js';

// Model types
export type {
  Aggregation,
  ArchitectureModel,
  Block,
  Connection,
  ContainerBlock,
  Endpoint,
  ExternalActor,
  LegacyConnection,
  ResourceBlock,
} from './model.js';

export {
  endpointId,
  generateEndpointsForBlock,
  connectionTypeToSemantic,
  parseEndpointId,
  resolveConnectionNodes,
} from './endpoints.js';

// Resource rules — single source of truth for constraints (Proposals 1–3)
export type {
  CanvasTier,
  PortPolicy,
  ResourceRuleEntry,
  ResourceType,
  ContainerCapableResourceType,
  LeafOnlyResourceType,
} from './rules.js';

export {
  RESOURCE_RULES,
  KNOWN_RESOURCE_TYPES,
  CONTAINER_CAPABLE_TYPES,
  CATEGORY_PORTS,
  isContainerCapable,
  getAllowedParents,
  getCanvasTier,
  getDefaultCategory,
  getPortsForResourceType,
} from './rules.js';
