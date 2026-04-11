import type { ProviderType, ResourceCategory } from './index';
import logger from '../utils/logger';

// Legacy size tier removed in v2.0 — use BlockTier instead

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
  micro: { width: 1, depth: 1, height: 1 },
  small: { width: 2, depth: 2, height: 1 },
  medium: { width: 2, depth: 2, height: 2 },
  large: { width: 3, depth: 3, height: 2 },
  wide: { width: 3, depth: 1, height: 1 },
};

/** Maps each category to its v2.0 tier. See CLOUDBLOCKS_SPEC_V2.md §5.2. */
/** Maps each category to its v2.0 tier. See CLOUDBLOCKS_SPEC_V2.md §5.2.
 *
 * Foundational categories (network, data) use 'large' (3×3×2 CU) to
 * visually communicate their role as base infrastructure that other
 * resources depend on.  All other categories use 'medium' (2×2×2 CU).
 * VNet/Subnet containers are unaffected (rendered via ContainerBlockSvg).
 */
export const CATEGORY_TIER_MAP: Record<ResourceCategory, BlockTier> = {
  network: 'large',
  security: 'medium',
  delivery: 'medium',
  compute: 'medium',
  data: 'large',
  messaging: 'medium',
  identity: 'medium',
  operations: 'medium',
};

export type BlockSurface = 'ported';
// ALL blocks have ports per Universal Port Standard. No 'smooth' surface.

export type BlockSilhouette = 'rect' | 'cylinder' | 'gateway' | 'circle' | 'hex' | 'shield';

export interface BlockVisualProfile {
  /** Size tier name for CSS/debugging */
  tier: BlockTier;
  /** Surface treatment - always 'ported' per Universal Port Standard */
  surface: BlockSurface;
  silhouette: BlockSilhouette;
  /** Port grid [columns, rows] - single source of truth for block port layout */
  footprint: [number, number];
  /** Can user applications be placed on this block? */
  hostable: boolean;
  /** Maximum number of apps that can be placed (0 if not hostable) */
  appCapacity: number;
}

// All resource blocks use uniform rect (cube) silhouette with 3×4 footprint.
// Silhouette differentiation was removed — all blocks are cubes.
// Tier varies by category (network/data → large, others → medium). Only color and icon differ.
export const BLOCK_VISUAL_PROFILES: Record<ResourceCategory, BlockVisualProfile> = {
  network: {
    tier: 'large',
    surface: 'ported',
    silhouette: 'rect',
    footprint: [3, 4],
    hostable: false,
    appCapacity: 0,
  },
  security: {
    tier: 'medium',
    surface: 'ported',
    silhouette: 'rect',
    footprint: [3, 4],
    hostable: false,
    appCapacity: 0,
  },
  delivery: {
    tier: 'medium',
    surface: 'ported',
    silhouette: 'rect',
    footprint: [3, 4],
    hostable: false,
    appCapacity: 0,
  },
  compute: {
    tier: 'medium',
    surface: 'ported',
    silhouette: 'rect',
    footprint: [3, 4],
    hostable: true,
    appCapacity: 4,
  },
  data: {
    tier: 'large',
    surface: 'ported',
    silhouette: 'rect',
    footprint: [3, 4],
    hostable: false,
    appCapacity: 0,
  },
  messaging: {
    tier: 'medium',
    surface: 'ported',
    silhouette: 'rect',
    footprint: [3, 4],
    hostable: false,
    appCapacity: 0,
  },
  identity: {
    tier: 'medium',
    surface: 'ported',
    silhouette: 'rect',
    footprint: [3, 4],
    hostable: false,
    appCapacity: 0,
  },
  operations: {
    tier: 'medium',
    surface: 'ported',
    silhouette: 'rect',
    footprint: [3, 4],
    hostable: false,
    appCapacity: 0,
  },
};

export function getBlockVisualProfile(category: ResourceCategory): BlockVisualProfile {
  const profile = BLOCK_VISUAL_PROFILES[category];
  if (!profile) {
    logger.warn(`Unknown resource category "${category}", falling back to "compute" profile.`);
    return BLOCK_VISUAL_PROFILES.compute;
  }
  return profile;
}

// ─── v2.0 Subtype Size Overrides ──────────────────────────────────
//
// Subtype overrides are intentionally empty — all blocks of the same
// category share that category's tier size. The override map is kept
// for forward-compatibility if per-subtype sizing is reintroduced.
export const SUBTYPE_SIZE_OVERRIDES: Record<string, BlockDimensionsCU> = {};

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
