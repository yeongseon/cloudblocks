// CloudBlocks Schema — Enumeration types
// Canonical type definitions shared between frontend and backend.

/**
 * Layer hierarchy in the containment model.
 * Ordered from broadest scope (global) to narrowest (resource).
 */
export type LayerType = 'global' | 'edge' | 'region' | 'zone' | 'subnet' | 'resource';

/**
 * Node kind discriminator for the ResourceNode union.
 * - container: holds child nodes (VNet, Subnet, Resource Group, etc.)
 * - resource: leaf resource that cannot contain children (VM, SQL DB, etc.)
 */
export type NodeKind = 'container' | 'resource';

/**
 * Resource categories — the 7 canonical resource groups.
 *
 * Migration from 10 → 7:
 *   compute   → compute   (was compute + function)
 *   data      → data      (was database + storage)
 *   edge      → edge      (was gateway)
 *   security  → security  (was identity)
 *   operations → operations (was analytics + observability)
 *   messaging → messaging  (was queue + event) — empty in MVP
 *   network   → network   (new — containers like VNet, Subnet)
 */
export type ResourceCategory =
  | 'network'
  | 'security'
  | 'edge'
  | 'compute'
  | 'data'
  | 'messaging'
  | 'operations';

/**
 * Subnet access visibility.
 */
export type SubnetAccess = 'public' | 'private';

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
 * Visual-only annotations that describe the function of a node.
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
 * Connection protocol/type between resource nodes.
 * Direction represents the **initiator** of the request.
 */
export type ConnectionType = 'dataflow' | 'http' | 'internal' | 'data' | 'async';

// ---------------------------------------------------------------------------
// Deprecated aliases — kept temporarily for migration, will be removed post-M19
// ---------------------------------------------------------------------------

/** @deprecated Use ResourceCategory instead. */
export type BlockCategory = ResourceCategory;

/** @deprecated PlateType is removed in the unified model. Use LayerType + NodeKind='container'. */
export type PlateType = 'global' | 'edge' | 'region' | 'zone' | 'subnet';
