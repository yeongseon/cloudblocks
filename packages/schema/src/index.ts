// CloudBlocks Schema — Canonical type definitions
// Shared between frontend and backend via JSON Schema bridge.

/** Schema version for the ArchitectureModel wire format. */
export const SCHEMA_VERSION = '2.0.0';

// Enumeration types
export type {
  AggregationMode,
  BlockCategory,
  BlockRole,
  ConnectionType,
  LayerType,
  PlateType,
  ProviderType,
  SubnetAccess,
} from './enums.js';

// Spatial types
export type { Position, Size } from './spatial.js';

// Model types
export type {
  Aggregation,
  ArchitectureModel,
  Block,
  Connection,
  ExternalActor,
  Plate,
} from './model.js';
