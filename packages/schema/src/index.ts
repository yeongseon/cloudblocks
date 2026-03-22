// CloudBlocks Schema — Canonical type definitions
// Shared between frontend and backend via JSON Schema bridge.

/** Schema version for the ArchitectureModel wire format. */
export const SCHEMA_VERSION = '4.0.0';

// Enumeration types
export type {
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

// Deprecated enum aliases (migration shims — remove post-M19)
export type { BlockCategory, PlateType } from './enums.js';

// Spatial types
export type { Position, Size } from './spatial.js';

// Model types
export type {
  Aggregation,
  ArchitectureModel,
  Connection,
  ContainerNode,
  Endpoint,
  ExternalActor,
  LegacyConnection,
  LeafNode,
  ResourceNode,
} from './model.js';

export { endpointId, generateEndpointsForNode, connectionTypeToSemantic, parseEndpointId, resolveConnectionNodes } from './endpoints.js';

// Deprecated model aliases (migration shims — remove post-M19)
export type { Block, Plate } from './model.js';

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
