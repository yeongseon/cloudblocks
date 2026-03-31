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

  // ── Delivery ────────────────────────────────────────────────
  dns_zone: {
    containerCapable: false,
    allowedParents: [null],
    category: 'delivery',
    canvasTier: 'web',
  },
  cdn_profile: {
    containerCapable: false,
    allowedParents: [null],
    category: 'delivery',
    canvasTier: 'web',
  },
  front_door: {
    containerCapable: false,
    allowedParents: [null],
    category: 'delivery',
    canvasTier: 'web',
  },
  application_gateway: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'delivery',
    canvasTier: 'web',
  },
  internal_load_balancer: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'delivery',
    canvasTier: 'web',
  },
  load_balancer: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'delivery',
    canvasTier: 'web',
  },
  outbound_access: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'delivery',
    canvasTier: 'web',
  },

  // ── External Actors (folded into blocks — v4 unification) ────
  internet: {
    containerCapable: false,
    allowedParents: [null],
    category: 'delivery',
    canvasTier: 'web',
  },
  browser: {
    containerCapable: false,
    allowedParents: [null],
    category: 'delivery',
    canvasTier: 'web',
  },

  // ── Compute ─────────────────────────────────────────────────
  function_compute: {
    containerCapable: false,
    allowedParents: ['subnet', null],
    category: 'compute',
    canvasTier: 'app',
  },
  app_service: {
    containerCapable: false,
    allowedParents: ['subnet', null],
    category: 'compute',
    canvasTier: 'app',
  },
  container_instances: {
    containerCapable: false,
    allowedParents: ['subnet', null],
    category: 'compute',
    canvasTier: 'app',
  },
  virtual_machine: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'compute',
    canvasTier: 'app',
  },
  kubernetes_cluster: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'compute',
    canvasTier: 'app',
  },
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
  blob_storage: {
    containerCapable: false,
    allowedParents: [null],
    category: 'data',
    canvasTier: 'data',
  },
  sql_database: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'data',
    canvasTier: 'data',
  },
  cosmos_db: {
    containerCapable: false,
    allowedParents: ['subnet', null],
    category: 'data',
    canvasTier: 'data',
  },
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
  key_vault: {
    containerCapable: false,
    allowedParents: ['subnet', null],
    category: 'security',
    canvasTier: 'shared',
  },
  bastion_host: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'security',
    canvasTier: 'shared',
  },
  firewall_security: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'security',
    canvasTier: 'shared',
  },
  network_security_group: {
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
    allowedParents: ['subnet', null],
    category: 'identity',
    canvasTier: 'shared',
  },
  managed_identity: {
    containerCapable: false,
    allowedParents: [null],
    category: 'identity',
    canvasTier: 'shared',
  },
  service_account: {
    containerCapable: false,
    allowedParents: [null],
    category: 'identity',
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
  nat_gateway: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'network',
    canvasTier: 'shared',
  },
  public_ip: {
    containerCapable: false,
    allowedParents: [null],
    category: 'network',
    canvasTier: 'shared',
  },
  route_table: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'network',
    canvasTier: 'shared',
  },
  private_endpoint: {
    containerCapable: false,
    allowedParents: ['subnet'],
    category: 'network',
    canvasTier: 'shared',
  },
} as const satisfies Record<string, ResourceRuleEntry>;

// ---------------------------------------------------------------------------
// Derived types (Proposal 1 — compile-time kind restriction)
// ---------------------------------------------------------------------------

/** All known resource type identifiers. */
export type ResourceType = keyof typeof RESOURCE_RULES;

/** Resource types that can be `kind: 'container'`. */
export type ContainerCapableResourceType = {
  [K in ResourceType]: (typeof RESOURCE_RULES)[K]['containerCapable'] extends true ? K : never;
}[ResourceType];

/** Resource types that must be `kind: 'resource'` (leaf only). */
export type LeafOnlyResourceType = Exclude<ResourceType, ContainerCapableResourceType>;

// ---------------------------------------------------------------------------
// Runtime helpers
// ---------------------------------------------------------------------------

/** All known resource type strings as a Set for O(1) lookup. */
export const KNOWN_RESOURCE_TYPES: ReadonlySet<string> = new Set(Object.keys(RESOURCE_RULES));

/** Resource types that can be containers. */
export const CONTAINER_CAPABLE_TYPES: ReadonlySet<string> = new Set(
  (Object.entries(RESOURCE_RULES) as [ResourceType, ResourceRuleEntry][])
    .filter(([, rule]) => rule.containerCapable)
    .map(([key]) => key),
);

/** Resource types that represent external actors folded into the block model (v4 unification). */
export const EXTERNAL_RESOURCE_TYPES: ReadonlySet<string> = new Set(['internet', 'browser']);

/**
 * Check whether a given resourceType is an external actor type
 * (internet, browser) folded into the block model.
 * Use this to filter external blocks from IaC output and apply
 * non-deployable styling.
 */
export function isExternalResourceType(resourceType: string): boolean {
  return EXTERNAL_RESOURCE_TYPES.has(resourceType);
}

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
export function getAllowedParents(resourceType: string): readonly (string | null)[] | undefined {
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
export function getDefaultCategory(resourceType: string): ResourceCategory | undefined {
  const rule = (RESOURCE_RULES as Record<string, ResourceRuleEntry>)[resourceType];
  return rule?.category;
}

// ---------------------------------------------------------------------------
// Category → default resource type mapping
// ---------------------------------------------------------------------------

/**
 * Default (representative) resource type for each category.
 * Used as a fallback when only a category is known (e.g., drag-to-create without
 * a specific subtype). Picks the most common / most restrictive type per category
 * so that placement validation produces reasonable results.
 */
export const CATEGORY_DEFAULT_RESOURCE_TYPE: Record<ResourceCategory, string> = {
  compute: 'web_compute',
  data: 'sql_database',
  delivery: 'application_gateway',
  messaging: 'message_queue',
  security: 'bastion_host',
  identity: 'identity_access',
  operations: 'monitoring',
  network: 'nat_gateway',
};
// ---------------------------------------------------------------------------
// Port policy — connection point counts per category
// ---------------------------------------------------------------------------

/** Port capacity for a resource category: how many inbound/outbound connection ports. */
export interface PortPolicy {
  readonly inbound: number;
  readonly outbound: number;
}

/** Default port counts per resource category. */
export const CATEGORY_PORTS: Record<ResourceCategory, PortPolicy> = {
  network: { inbound: 1, outbound: 1 },
  delivery: { inbound: 1, outbound: 2 },
  compute: { inbound: 2, outbound: 2 },
  data: { inbound: 2, outbound: 1 },
  messaging: { inbound: 2, outbound: 2 },
  security: { inbound: 1, outbound: 1 },
  identity: { inbound: 1, outbound: 1 },
  operations: { inbound: 1, outbound: 1 },
};

/**
 * Get port capacity for a resource type.
 * Looks up the category from RESOURCE_RULES, then returns CATEGORY_PORTS for that category.
 * Returns a default of { inbound: 1, outbound: 1 } for unknown types.
 */
export function getPortsForResourceType(resourceType: string): PortPolicy {
  const rule = (RESOURCE_RULES as Record<string, ResourceRuleEntry>)[resourceType];
  if (!rule) return { inbound: 1, outbound: 1 };
  return CATEGORY_PORTS[rule.category];
}
