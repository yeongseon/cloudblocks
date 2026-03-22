import type { ProviderType, ResourceCategory } from './index';

// BrickSizeTier removed in v2.0 — use BlockTier instead

// ─── v2.0 Tier System (CU-based) ───────────────────────────────────
// See CLOUDBLOCKS_SPEC_V2.md §5.2
export type BlockTier = 'micro' | 'small' | 'medium' | 'large' | 'wide';

/** Block dimensions in Cloud Units (CU). All integer values. */
export interface BlockDimensionsCU {
  width: number;
  depth: number;
  height: number;
}

/** Maps each v2.0 tier to its CU dimensions (W×D×H). */
export const TIER_DIMENSIONS: Record<BlockTier, BlockDimensionsCU> = {
  micro:  { width: 1, depth: 1, height: 1 },
  small:  { width: 2, depth: 2, height: 1 },
  medium: { width: 2, depth: 2, height: 2 },
  large:  { width: 3, depth: 3, height: 2 },
  wide:   { width: 3, depth: 1, height: 1 },
};

/** Maps each category to its v2.0 tier. See CLOUDBLOCKS_SPEC_V2.md §5.2. */
export const CATEGORY_TIER_MAP: Record<ResourceCategory, BlockTier> = {
  network: 'large',
  security: 'small',
  edge: 'wide',
  compute: 'medium',
  data: 'large',
  messaging: 'micro',
  operations: 'small',
};

export type BrickSurface = 'studded';
// ALL blocks are studded per Universal Stud Standard. No 'smooth' surface.

export type BrickSilhouette = 'rect' | 'cylinder' | 'gateway' | 'circle' | 'hex' | 'shield';

export interface BlockVisualProfile {
  /** Size tier name for CSS/debugging */
  tier: BlockTier;
  /** Surface treatment - always 'studded' per Universal Stud Standard */
  surface: BrickSurface;
  silhouette: BrickSilhouette;
  /** Stud grid [columns, rows] - single source of truth for block stud layout */
  footprint: [number, number];
  /** Can user applications be placed on this block? */
  hostable: boolean;
  /** Maximum number of apps that can be placed (0 if not hostable) */
  appCapacity: number;
}

export const BLOCK_VISUAL_PROFILES: Record<ResourceCategory, BlockVisualProfile> = {
  network: {
    tier: 'large',
    surface: 'studded',
    silhouette: 'rect',
    footprint: [4, 6],
    hostable: false,
    appCapacity: 0,
  },
  security: {
    tier: 'small',
    surface: 'studded',
    silhouette: 'shield',
    footprint: [2, 2],
    hostable: false,
    appCapacity: 0,
  },
  edge: {
    tier: 'wide',
    surface: 'studded',
    silhouette: 'gateway',
    footprint: [2, 4],
    hostable: false,
    appCapacity: 0,
  },
  compute: {
    tier: 'medium',
    surface: 'studded',
    silhouette: 'rect',
    footprint: [3, 4],
    hostable: true,
    appCapacity: 4,
  },
  data: {
    tier: 'large',
    surface: 'studded',
    silhouette: 'cylinder',
    footprint: [4, 6],
    hostable: false,
    appCapacity: 0,
  },
  messaging: {
    tier: 'micro',
    surface: 'studded',
    silhouette: 'hex',
    footprint: [2, 4],
    hostable: false,
    appCapacity: 0,
  },
  operations: {
    tier: 'small',
    surface: 'studded',
    silhouette: 'circle',
    footprint: [2, 2],
    hostable: false,
    appCapacity: 0,
  },
};

export function getBlockVisualProfile(category: ResourceCategory): BlockVisualProfile {
  const profile = BLOCK_VISUAL_PROFILES[category];
  if (!profile) {
    console.warn(`Unknown resource category "${category}", falling back to "compute" profile.`);
    return BLOCK_VISUAL_PROFILES.compute;
  }
  return profile;
}

// ─── v2.0 Subtype Size Overrides (CLOUDBLOCKS_SPEC_V2.md §6) ─────

/**
 * Subtype size override key format: `provider:registryId` (e.g. `aws:ec2`, `azure:cosmos-db`).
 * When a block has a specific subtype, its CU size may differ from the
 * category default tier size.
 */
export const SUBTYPE_SIZE_OVERRIDES: Record<string, BlockDimensionsCU> = {
  // ── AWS (§6.1) ──────────────────────────────────────────────────
  'aws:ec2':           { width: 2, depth: 2, height: 2 },
  'aws:lambda':        { width: 1, depth: 1, height: 1 },
  'aws:ecs':           { width: 2, depth: 2, height: 2 },
  'aws:eks':           { width: 2, depth: 2, height: 2 },
  'aws:rds-postgres':  { width: 3, depth: 3, height: 2 },
  'aws:dynamodb':      { width: 3, depth: 3, height: 2 },
  'aws:s3':            { width: 3, depth: 3, height: 2 },
  'aws:alb':           { width: 3, depth: 1, height: 1 },
  'aws:elb':           { width: 3, depth: 1, height: 1 },
  'aws:api-gateway':   { width: 3, depth: 1, height: 1 },
  'aws:cloudfront':    { width: 4, depth: 1, height: 1 },
  'aws:nat-gateway':   { width: 2, depth: 1, height: 1 },
  'aws:sqs':           { width: 1, depth: 1, height: 1 },
  'aws:sns':           { width: 1, depth: 1, height: 1 },
  'aws:eventbridge':   { width: 1, depth: 1, height: 1 },
  'aws:route-53':      { width: 4, depth: 1, height: 1 },
  'aws:cloudwatch':    { width: 2, depth: 2, height: 1 },
  'aws:iam':           { width: 2, depth: 2, height: 1 },
  'aws:kinesis':       { width: 3, depth: 3, height: 2 },
  'aws:redshift':      { width: 3, depth: 3, height: 2 },
  'aws:elasticache':   { width: 3, depth: 3, height: 2 },

  // ── Azure (§6.2) ───────────────────────────────────────────────
  'azure:vm':                    { width: 2, depth: 2, height: 2 },
  'azure:functions':             { width: 1, depth: 1, height: 1 },
  'azure:aks':                   { width: 2, depth: 2, height: 2 },
  'azure:cosmos-db':             { width: 3, depth: 3, height: 2 },
  'azure:sql-database':          { width: 3, depth: 3, height: 2 },
  'azure:blob-storage':          { width: 3, depth: 3, height: 2 },
  'azure:application-gateway':   { width: 3, depth: 1, height: 1 },
  'azure:front-door':            { width: 4, depth: 1, height: 1 },
  'azure:azure-firewall':        { width: 2, depth: 1, height: 1 },
  'azure:service-bus':           { width: 1, depth: 1, height: 1 },
  'azure:event-grid':            { width: 1, depth: 1, height: 1 },
  'azure:event-hubs':            { width: 1, depth: 1, height: 1 },
  'azure:azure-monitor':         { width: 2, depth: 2, height: 1 },
  'azure:entra-id':              { width: 2, depth: 2, height: 1 },
  'azure:azure-dns':             { width: 4, depth: 1, height: 1 },
  'azure:azure-cache-for-redis': { width: 3, depth: 3, height: 2 },
  'azure:azure-synapse':         { width: 3, depth: 3, height: 2 },

  // ── GCP (§6.3) ─────────────────────────────────────────────────
  'gcp:compute-engine':        { width: 2, depth: 2, height: 2 },
  'gcp:cloud-functions':       { width: 1, depth: 1, height: 1 },
  'gcp:gke':                   { width: 2, depth: 2, height: 2 },
  'gcp:cloud-sql-postgres':    { width: 3, depth: 3, height: 2 },
  'gcp:cloud-spanner':         { width: 3, depth: 3, height: 2 },
  'gcp:cloud-storage':         { width: 3, depth: 3, height: 2 },
  'gcp:cloud-load-balancing':  { width: 3, depth: 1, height: 1 },
  'gcp:cloud-cdn':             { width: 4, depth: 1, height: 1 },
  'gcp:cloud-armor':           { width: 2, depth: 1, height: 1 },
  'gcp:pub-sub':               { width: 1, depth: 1, height: 1 },
  'gcp:eventarc':              { width: 1, depth: 1, height: 1 },
  'gcp:cloud-monitoring':      { width: 2, depth: 2, height: 1 },
  'gcp:cloud-iam':             { width: 2, depth: 2, height: 1 },
  'gcp:cloud-dns':             { width: 4, depth: 1, height: 1 },
  'gcp:memorystore':           { width: 3, depth: 3, height: 2 },
  'gcp:bigquery':              { width: 3, depth: 3, height: 2 },
  'gcp:dataflow':              { width: 3, depth: 3, height: 2 },
};

/**
 * Resolve block dimensions in CU with the following priority:
 *   1. Subtype override (`provider:subtype` key in SUBTYPE_SIZE_OVERRIDES)
 *   2. Category default tier size (via CATEGORY_TIER_MAP → TIER_DIMENSIONS)
 *
 * @param category  — The block's category (e.g., 'compute', 'database')
 * @param provider  — Optional provider (e.g., 'aws', 'azure', 'gcp')
 * @param subtype   — Optional subtype registry ID (e.g., 'ec2', 'cosmos-db')
 * @returns The resolved CU dimensions
 */
export function getBlockDimensions(
  category: ResourceCategory,
  provider?: ProviderType,
  subtype?: string,
): BlockDimensionsCU {
  // 1. Check subtype override
  if (provider && subtype) {
    const key = `${provider}:${subtype}`;
    const override = SUBTYPE_SIZE_OVERRIDES[key];
    if (override) return override;
  }

  // 2. Fall back to category default tier size
  const tier = CATEGORY_TIER_MAP[category] ?? CATEGORY_TIER_MAP.compute;
  return TIER_DIMENSIONS[tier];
}
