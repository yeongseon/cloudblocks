import type { BlockCategory, ProviderType } from './index';

// ─── v1.x Legacy Tier System (kept for backward compatibility) ──────
export type BrickSizeTier = 'signal' | 'light' | 'service' | 'core' | 'anchor';

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
export const CATEGORY_TIER_MAP: Record<BlockCategory, BlockTier> = {
  compute:       'medium',
  database:      'large',
  storage:       'medium',
  gateway:       'wide',
  function:      'micro',
  queue:         'micro',
  event:         'micro',
  analytics:     'large',
  identity:      'small',
  observability: 'small',
};

export type BrickSurface = 'studded';
// ALL blocks are studded per Universal Stud Standard. No 'smooth' surface.

export type BrickSilhouette = 'tower' | 'heavy' | 'shield' | 'module';

export interface BlockVisualProfile {
  /** Size tier name for CSS/debugging */
  tier: BrickSizeTier;
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

export const BLOCK_VISUAL_PROFILES: Record<BlockCategory, BlockVisualProfile> = {
  event: {
    tier: 'signal',
    surface: 'studded',
    silhouette: 'module',
    footprint: [1, 2],
    hostable: false,
    appCapacity: 0,
  },
  function: {
    tier: 'light',
    surface: 'studded',
    silhouette: 'module',
    footprint: [2, 2],
    hostable: true,
    appCapacity: 1,
  },
  queue: {
    tier: 'service',
    surface: 'studded',
    silhouette: 'module',
    footprint: [2, 4],
    hostable: false,
    appCapacity: 0,
  },
  gateway: {
    tier: 'service',
    surface: 'studded',
    silhouette: 'shield',
    footprint: [2, 4],
    hostable: false,
    appCapacity: 0,
  },
  storage: {
    tier: 'service',
    surface: 'studded',
    silhouette: 'heavy',
    footprint: [2, 4],
    hostable: false,
    appCapacity: 0,
  },
  identity: {
    tier: 'light',
    surface: 'studded',
    silhouette: 'module',
    footprint: [2, 2],
    hostable: false,
    appCapacity: 0,
  },
  observability: {
    tier: 'light',
    surface: 'studded',
    silhouette: 'module',
    footprint: [2, 2],
    hostable: false,
    appCapacity: 0,
  },
  compute: {
    tier: 'core',
    surface: 'studded',
    silhouette: 'tower',
    footprint: [3, 4],
    hostable: true,
    appCapacity: 4,
  },
  database: {
    tier: 'anchor',
    surface: 'studded',
    silhouette: 'heavy',
    footprint: [4, 6],
    hostable: false,
    appCapacity: 0,
  },
  analytics: {
    tier: 'anchor',
    surface: 'studded',
    silhouette: 'heavy',
    footprint: [4, 6],
    hostable: false,
    appCapacity: 0,
  },
};

export function getBlockVisualProfile(category: BlockCategory): BlockVisualProfile {
  return BLOCK_VISUAL_PROFILES[category];
}

// ─── v2.0 Subtype Size Overrides (CLOUDBLOCKS_SPEC_V2.md §6) ─────

/**
 * Subtype size override key format: `provider:SubtypeName`.
 * When a block has a specific subtype, its CU size may differ from the
 * category default tier size.
 */
export const SUBTYPE_SIZE_OVERRIDES: Record<string, BlockDimensionsCU> = {
  // ── AWS (§6.1) ──────────────────────────────────────────────────
  'aws:EC2':           { width: 2, depth: 2, height: 2 },
  'aws:Lambda':        { width: 1, depth: 1, height: 1 },
  'aws:ECS':           { width: 2, depth: 2, height: 2 },
  'aws:EKS':           { width: 2, depth: 2, height: 2 },
  'aws:RDS':           { width: 3, depth: 3, height: 2 },
  'aws:DynamoDB':      { width: 3, depth: 3, height: 2 },
  'aws:S3':            { width: 3, depth: 3, height: 2 },
  'aws:ALB':           { width: 3, depth: 1, height: 1 },
  'aws:ELB':           { width: 3, depth: 1, height: 1 },
  'aws:API Gateway':   { width: 3, depth: 1, height: 1 },
  'aws:CloudFront':    { width: 4, depth: 1, height: 1 },
  'aws:NAT Gateway':   { width: 2, depth: 1, height: 1 },
  'aws:SQS':           { width: 1, depth: 1, height: 1 },
  'aws:SNS':           { width: 1, depth: 1, height: 1 },
  'aws:EventBridge':   { width: 1, depth: 1, height: 1 },
  'aws:Route 53':      { width: 4, depth: 1, height: 1 },
  'aws:CloudWatch':    { width: 2, depth: 2, height: 1 },
  'aws:IAM':           { width: 2, depth: 2, height: 1 },
  'aws:Kinesis':       { width: 3, depth: 3, height: 2 },
  'aws:Redshift':      { width: 3, depth: 3, height: 2 },
  'aws:ElastiCache':   { width: 3, depth: 3, height: 2 },

  // ── Azure (§6.2) ───────────────────────────────────────────────
  'azure:Virtual Machine':       { width: 2, depth: 2, height: 2 },
  'azure:Function App':          { width: 1, depth: 1, height: 1 },
  'azure:AKS':                   { width: 2, depth: 2, height: 2 },
  'azure:Cosmos DB':             { width: 3, depth: 3, height: 2 },
  'azure:Azure SQL Database':    { width: 3, depth: 3, height: 2 },
  'azure:Storage Account':       { width: 3, depth: 3, height: 2 },
  'azure:Application Gateway':   { width: 3, depth: 1, height: 1 },
  'azure:Front Door':            { width: 4, depth: 1, height: 1 },
  'azure:Azure Firewall':        { width: 2, depth: 1, height: 1 },
  'azure:Service Bus':           { width: 1, depth: 1, height: 1 },
  'azure:Event Grid':            { width: 1, depth: 1, height: 1 },
  'azure:Event Hubs':            { width: 1, depth: 1, height: 1 },
  'azure:Azure Monitor':         { width: 2, depth: 2, height: 1 },
  'azure:Entra ID':              { width: 2, depth: 2, height: 1 },
  'azure:Azure DNS':             { width: 4, depth: 1, height: 1 },
  'azure:Azure Cache for Redis': { width: 3, depth: 3, height: 2 },
  'azure:Azure Synapse':         { width: 3, depth: 3, height: 2 },

  // ── GCP (§6.3) ─────────────────────────────────────────────────
  'gcp:Compute Engine':        { width: 2, depth: 2, height: 2 },
  'gcp:Cloud Functions':       { width: 1, depth: 1, height: 1 },
  'gcp:GKE':                   { width: 2, depth: 2, height: 2 },
  'gcp:Cloud SQL':             { width: 3, depth: 3, height: 2 },
  'gcp:Cloud Spanner':         { width: 3, depth: 3, height: 2 },
  'gcp:Cloud Storage':         { width: 3, depth: 3, height: 2 },
  'gcp:Cloud Load Balancing':  { width: 3, depth: 1, height: 1 },
  'gcp:Cloud CDN':             { width: 4, depth: 1, height: 1 },
  'gcp:Cloud Armor':           { width: 2, depth: 1, height: 1 },
  'gcp:Pub/Sub':               { width: 1, depth: 1, height: 1 },
  'gcp:Eventarc':              { width: 1, depth: 1, height: 1 },
  'gcp:Cloud Monitoring':      { width: 2, depth: 2, height: 1 },
  'gcp:Cloud IAM':             { width: 2, depth: 2, height: 1 },
  'gcp:Cloud DNS':             { width: 4, depth: 1, height: 1 },
  'gcp:Memorystore':           { width: 3, depth: 3, height: 2 },
  'gcp:BigQuery':              { width: 3, depth: 3, height: 2 },
  'gcp:Dataflow':              { width: 3, depth: 3, height: 2 },
};

/**
 * Resolve block dimensions in CU with the following priority:
 *   1. Subtype override (`provider:subtype` key in SUBTYPE_SIZE_OVERRIDES)
 *   2. Category default tier size (via CATEGORY_TIER_MAP → TIER_DIMENSIONS)
 *
 * @param category  — The block's category (e.g., 'compute', 'database')
 * @param provider  — Optional provider (e.g., 'aws', 'azure', 'gcp')
 * @param subtype   — Optional subtype name (e.g., 'EC2', 'Cosmos DB')
 * @returns The resolved CU dimensions
 */
export function getBlockDimensions(
  category: BlockCategory,
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
  const tier = CATEGORY_TIER_MAP[category];
  return TIER_DIMENSIONS[tier];
}
