// CloudBlocks Schema — Enumeration types
// Canonical type definitions shared between frontend and backend.

/**
 * Layer hierarchy in the containment model.
 * Ordered from broadest scope (global) to narrowest (resource).
 */
export type LayerType = 'global' | 'edge' | 'region' | 'zone' | 'subnet' | 'resource';

/**
 * Plate types — a subset of LayerType (excludes 'resource').
 * Plates are visual containers that hold blocks and child plates.
 */
export type PlateType = 'global' | 'edge' | 'region' | 'zone' | 'subnet';

/**
 * Subnet access visibility.
 */
export type SubnetAccess = 'public' | 'private';

/**
 * Block resource categories — the 10 canonical resource types.
 */
export type BlockCategory =
  | 'compute'
  | 'database'
  | 'storage'
  | 'gateway'
  | 'function'
  | 'queue'
  | 'event'
  | 'analytics'
  | 'identity'
  | 'observability';

/**
 * Cloud provider identifiers (alphabetical order — canonical).
 */
export type ProviderType = 'azure' | 'aws' | 'gcp';

/**
 * Aggregation mode for block instances (v2.0 §8).
 */
export type AggregationMode = 'single' | 'count';

/**
 * Block role indicators (v2.0 §9).
 * Visual-only annotations that describe the function of a block.
 */
export type BlockRole =
  | 'primary'
  | 'secondary'
  | 'reader'
  | 'writer'
  | 'public'
  | 'private'
  | 'internal'
  | 'external';

/**
 * Connection protocol/type between blocks.
 * Direction represents the **initiator** of the request.
 */
export type ConnectionType = 'dataflow' | 'http' | 'internal' | 'data' | 'async';
