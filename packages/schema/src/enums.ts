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
 * Resource categories — the 8 canonical resource groups.
 *
 * Migration from 10 → 7 → 8:
 *   compute    → compute    (was compute + function)
 *   data       → data       (was database + storage)
 *   delivery   → delivery   (renamed from edge; was gateway)
 *   security   → security   (was identity in v6)
 *   identity   → identity   (split from security; new in v8)
 *   operations → operations (was analytics + observability)
 *   messaging  → messaging  (was queue + event) — empty in MVP
 *   network    → network    (new — containers like VNet, Subnet)
 */
export type ResourceCategory =
  | 'network'
  | 'delivery'
  | 'compute'
  | 'data'
  | 'messaging'
  | 'security'
  | 'identity'
  | 'operations';

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
/** @deprecated Use EndpointSemantic for v4 connections. Kept for v3→v4 migration only. */
export type ConnectionType = 'dataflow' | 'http' | 'internal' | 'data' | 'async';

/** Direction of an endpoint on a node. */
export type EndpointDirection = 'input' | 'output';

/** Semantic type of an endpoint — determines what kind of traffic flows. */
export type EndpointSemantic = 'http' | 'event' | 'data';

// ---------------------------------------------------------------------------
// Deprecated aliases — kept temporarily for migration, will be removed post-M19
// ---------------------------------------------------------------------------

/** @deprecated Use ResourceCategory instead. */
export type BlockCategory = ResourceCategory;

/** @deprecated PlateType is removed in the unified model. Use LayerType + NodeKind='container'. */
export type PlateType = 'global' | 'edge' | 'region' | 'zone' | 'subnet';
