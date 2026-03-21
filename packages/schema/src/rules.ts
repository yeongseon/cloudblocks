// CloudBlocks Schema — Resource Rules
// Single source of truth for resource type constraints, containment rules,
// and canvas tier defaults. Drives both compile-time types and runtime validation.

import type { ResourceCategory } from './enums.js';

/**
 * Canvas tier — the structural grouping visible on the canvas.
 * Orthogonal to both `category` (domain) and `layer` (hierarchy).
 *
 * - shared: cross-cutting resources (VNet, identity, monitoring)
 * - web:    public-facing tier (load balancers, CDN, WAF)
 * - app:    application tier (compute instances, functions)
 * - data:   persistence tier (databases, caches, storage)
 */
export type CanvasTier = 'shared' | 'web' | 'app' | 'data';

/**
 * Rule entry for a single resource type.
 * - containerCapable: whether this resource type can be `kind: 'container'`
 * - allowedParents: which parent resourceTypes are valid (`null` = root-level)
 * - category: default ResourceCategory for this resource type
 * - canvasTier: default canvas tier for UI grouping
 */
export interface ResourceRuleEntry {
  readonly containerCapable: boolean;
  readonly allowedParents: readonly (string | null)[];
  readonly category: ResourceCategory;
  readonly canvasTier: CanvasTier;
}

/**
 * RESOURCE_RULES — the canonical constraint table.
 *
 * Every known resource type is listed here with its:
 * 1. Container capability (Proposal 1)
 * 2. Allowed parent resource types (Proposal 3)
 * 3. Default category and canvas tier (Proposal 2)
 */
export const RESOURCE_RULES = {
  // ── Containers ──────────────────────────────────────────────
  virtual_network: {
    containerCapable: true,
    allowedParents: [null],
    category: 'network',
    canvasTier: 'shared',
  },
  subnet: {
    containerCapable: true,
    allowedParents: ['virtual_network'],
    category: 'network',
    canvasTier: 'shared',
  },

  // ── Edge ────────────────────────────────────────────────────
  load_balancer: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'edge',
    canvasTier: 'web',
  },
  outbound_access: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'edge',
    canvasTier: 'web',
  },

  // ── Compute ─────────────────────────────────────────────────
  web_compute: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'compute',
    canvasTier: 'web',
  },
  app_compute: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'compute',
    canvasTier: 'app',
  },

  // ── Data ────────────────────────────────────────────────────
  relational_database: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'data',
    canvasTier: 'data',
  },
  cache_store: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'data',
    canvasTier: 'data',
  },

  // ── Security ────────────────────────────────────────────────
  firewall_security: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'security',
    canvasTier: 'shared',
  },
  secret_store: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'security',
    canvasTier: 'shared',
  },
  identity_access: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'security',
    canvasTier: 'shared',
  },

  // ── Operations ──────────────────────────────────────────────
  monitoring: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'operations',
    canvasTier: 'shared',
  },

  // ── Messaging ──────────────────────────────────────────────
  message_queue: {
    containerCapable: false,
    allowedParents: ['virtual_network'],
    category: 'messaging',
    canvasTier: 'app',
  },
  event_hub: {
    containerCapable: false,
    allowedParents: ['virtual_network'],
    category: 'messaging',
    canvasTier: 'app',
  },
} as const satisfies Record<string, ResourceRuleEntry>;

// ---------------------------------------------------------------------------
// Derived types (Proposal 1 — compile-time kind restriction)
// ---------------------------------------------------------------------------

/** All known resource type identifiers. */
export type ResourceType = keyof typeof RESOURCE_RULES;

/** Resource types that can be `kind: 'container'`. */
export type ContainerCapableResourceType = {
  [K in ResourceType]: (typeof RESOURCE_RULES)[K]['containerCapable'] extends true
    ? K
    : never;
}[ResourceType];

/** Resource types that must be `kind: 'resource'` (leaf only). */
export type LeafOnlyResourceType = Exclude<ResourceType, ContainerCapableResourceType>;

// ---------------------------------------------------------------------------
// Runtime helpers
// ---------------------------------------------------------------------------

/** All known resource type strings as a Set for O(1) lookup. */
export const KNOWN_RESOURCE_TYPES: ReadonlySet<string> = new Set(
  Object.keys(RESOURCE_RULES)
);

/** Resource types that can be containers. */
export const CONTAINER_CAPABLE_TYPES: ReadonlySet<string> = new Set(
  (Object.entries(RESOURCE_RULES) as [ResourceType, ResourceRuleEntry][])
    .filter(([, rule]) => rule.containerCapable)
    .map(([key]) => key)
);

/**
 * Check whether a given resourceType is allowed to be `kind: 'container'`.
 */
export function isContainerCapable(resourceType: string): boolean {
  return CONTAINER_CAPABLE_TYPES.has(resourceType);
}

/**
 * Get the allowed parent resource types for a given resource type.
 * Returns `undefined` for unknown resource types.
 */
export function getAllowedParents(
  resourceType: string
): readonly (string | null)[] | undefined {
  const rule = (RESOURCE_RULES as Record<string, ResourceRuleEntry>)[resourceType];
  return rule?.allowedParents;
}

/**
 * Get the default canvas tier for a given resource type.
 * Returns `undefined` for unknown resource types.
 */
export function getCanvasTier(resourceType: string): CanvasTier | undefined {
  const rule = (RESOURCE_RULES as Record<string, ResourceRuleEntry>)[resourceType];
  return rule?.canvasTier;
}

/**
 * Get the default category for a given resource type.
 * Returns `undefined` for unknown resource types.
 */
export function getDefaultCategory(
  resourceType: string
): ResourceCategory | undefined {
  const rule = (RESOURCE_RULES as Record<string, ResourceRuleEntry>)[resourceType];
  return rule?.category;
}
