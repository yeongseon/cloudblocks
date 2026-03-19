import type { BlockCategory } from './index';

export type BrickSizeTier = 'signal' | 'light' | 'service' | 'core' | 'anchor';

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
  timer: {
    tier: 'signal',
    surface: 'studded',
    silhouette: 'module',
    footprint: [1, 2],
    hostable: false,
    appCapacity: 0,
  },
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
  gateway: {
    tier: 'service',
    surface: 'studded',
    silhouette: 'shield',
    footprint: [2, 4],
    hostable: false,
    appCapacity: 0,
  },
  queue: {
    tier: 'service',
    surface: 'studded',
    silhouette: 'module',
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
};

export function getBlockVisualProfile(category: BlockCategory): BlockVisualProfile {
  return BLOCK_VISUAL_PROFILES[category];
}
