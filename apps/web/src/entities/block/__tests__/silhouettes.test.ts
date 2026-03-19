import { describe, expect, it } from 'vitest';

import {
  cuToSilhouetteDimensions,
  getSilhouetteFromCU,
  SILHOUETTE_GENERATORS,
} from '../silhouettes';
import {
  BLOCK_VISUAL_PROFILES,
  type BlockCategory,
  type BrickSilhouette,
  type BrickSizeTier,
} from '../../../shared/types/index';
import type { BlockDimensionsCU } from '../../../shared/types/visualProfile';
import {
  CATEGORY_TIER_MAP,
  TIER_DIMENSIONS,
} from '../../../shared/types/visualProfile';
import {
  BLOCK_MARGIN,
  BLOCK_PADDING,
  TILE_H,
  TILE_W,
  TILE_Z,
} from '../../../shared/tokens/designTokens';

const blockCategories: BlockCategory[] = [
  'compute',
  'database',
  'storage',
  'gateway',
  'function',
  'queue',
  'event',
  'analytics',
  'identity',
  'observability',
];

const silhouetteTypes: BrickSilhouette[] = ['tower', 'heavy', 'shield', 'module'];
const sizeTiers: BrickSizeTier[] = ['signal', 'light', 'service', 'core', 'anchor'];

function makeDimensions(sideWallPx: number) {
  return {
    screenWidth: 224,
    diamondHeight: 112,
    sideWallPx,
    cx: 112,
    topY: 10,
    midY: 66,
    bottomY: 122,
    leftX: 10,
    rightX: 214,
    margin: 10,
    padding: 10,
  };
}

// ─── Pixel-Based Generators (v1.x API) ──────────────────────

describe('block silhouettes', () => {
  it.each(silhouetteTypes)('%s generator returns non-empty polygon strings', (silhouette) => {
    const generator = SILHOUETTE_GENERATORS[silhouette];
    const polygons = generator(makeDimensions(24));

    expect(typeof polygons.topFacePoints).toBe('string');
    expect(polygons.topFacePoints.trim().length).toBeGreaterThan(0);
    expect(typeof polygons.leftSidePoints).toBe('string');
    expect(polygons.leftSidePoints.trim().length).toBeGreaterThan(0);
    expect(typeof polygons.rightSidePoints).toBe('string');
    expect(polygons.rightSidePoints.trim().length).toBeGreaterThan(0);
  });

  it.each(silhouetteTypes)('%s generator output changes with height changes', (silhouette) => {
    const generator = SILHOUETTE_GENERATORS[silhouette];
    const low = generator(makeDimensions(16));
    const high = generator(makeDimensions(48));

    expect(low.leftSidePoints).not.toBe(high.leftSidePoints);
    expect(low.rightSidePoints).not.toBe(high.rightSidePoints);
  });
});

// ─── Visual Profile Coverage ────────────────────────────────

describe('visual profile coverage', () => {
  it('covers every block category with a profile', () => {
    expect(Object.keys(BLOCK_VISUAL_PROFILES).sort()).toEqual([...blockCategories].sort());
  });

  it('uses valid tier and silhouette values for each category profile', () => {
    for (const category of blockCategories) {
      const profile = BLOCK_VISUAL_PROFILES[category];

      expect(profile).toBeDefined();
      expect(sizeTiers).toContain(profile.tier);
      expect(silhouetteTypes).toContain(profile.silhouette);
      expect(profile.surface).toBe('studded');
      expect(SILHOUETTE_GENERATORS[profile.silhouette]).toBeTypeOf('function');
    }
  });
});

// ─── CU-Based Dimension Conversion (v2.0) ─────────────────

describe('cuToSilhouetteDimensions', () => {
  it('computes screenWidth as (width + depth) × TILE_W / 2', () => {
    const cu: BlockDimensionsCU = { width: 2, depth: 2, height: 2 };
    const dims = cuToSilhouetteDimensions(cu);
    expect(dims.screenWidth).toBe((2 + 2) * TILE_W / 2);
  });

  it('computes diamondHeight as (width + depth) × TILE_H / 2', () => {
    const cu: BlockDimensionsCU = { width: 3, depth: 3, height: 2 };
    const dims = cuToSilhouetteDimensions(cu);
    expect(dims.diamondHeight).toBe((3 + 3) * TILE_H / 2);
  });

  it('computes sideWallPx as height × TILE_Z', () => {
    const cu: BlockDimensionsCU = { width: 2, depth: 2, height: 2 };
    const dims = cuToSilhouetteDimensions(cu);
    expect(dims.sideWallPx).toBe(2 * TILE_Z);
  });

  it('sets margin and padding from design tokens', () => {
    const cu: BlockDimensionsCU = { width: 1, depth: 1, height: 1 };
    const dims = cuToSilhouetteDimensions(cu);
    expect(dims.margin).toBe(BLOCK_MARGIN);
    expect(dims.padding).toBe(BLOCK_PADDING);
  });

  it('computes cx as half of screenWidth', () => {
    const cu: BlockDimensionsCU = { width: 3, depth: 1, height: 1 };
    const dims = cuToSilhouetteDimensions(cu);
    expect(dims.cx).toBe(dims.screenWidth / 2);
  });

  it('computes topY, midY, bottomY from diamondHeight + padding', () => {
    const cu: BlockDimensionsCU = { width: 2, depth: 2, height: 1 };
    const dims = cuToSilhouetteDimensions(cu);

    expect(dims.topY).toBe(BLOCK_PADDING);
    expect(dims.midY).toBe(dims.diamondHeight / 2 + BLOCK_PADDING);
    expect(dims.bottomY).toBe(dims.diamondHeight + BLOCK_PADDING);
  });

  it('computes leftX and rightX from margin/screenWidth', () => {
    const cu: BlockDimensionsCU = { width: 3, depth: 3, height: 2 };
    const dims = cuToSilhouetteDimensions(cu);

    expect(dims.leftX).toBe(BLOCK_MARGIN);
    expect(dims.rightX).toBe(dims.screenWidth - BLOCK_MARGIN);
  });

  it('produces correct values for all v2.0 tiers from spec §13', () => {
    // Micro (1×1×1)
    const micro = cuToSilhouetteDimensions({ width: 1, depth: 1, height: 1 });
    expect(micro.screenWidth).toBe(64);
    expect(micro.diamondHeight).toBe(32);
    expect(micro.sideWallPx).toBe(32);

    // Small (2×2×1)
    const small = cuToSilhouetteDimensions({ width: 2, depth: 2, height: 1 });
    expect(small.screenWidth).toBe(128);
    expect(small.diamondHeight).toBe(64);
    expect(small.sideWallPx).toBe(32);

    // Medium (2×2×2)
    const medium = cuToSilhouetteDimensions({ width: 2, depth: 2, height: 2 });
    expect(medium.screenWidth).toBe(128);
    expect(medium.diamondHeight).toBe(64);
    expect(medium.sideWallPx).toBe(64);

    // Large (3×3×2)
    const large = cuToSilhouetteDimensions({ width: 3, depth: 3, height: 2 });
    expect(large.screenWidth).toBe(192);
    expect(large.diamondHeight).toBe(96);
    expect(large.sideWallPx).toBe(64);

    // Wide (3×1×1)
    const wide = cuToSilhouetteDimensions({ width: 3, depth: 1, height: 1 });
    expect(wide.screenWidth).toBe(128);
    expect(wide.diamondHeight).toBe(64);
    expect(wide.sideWallPx).toBe(32);
  });
});

// ─── CU-Based Silhouette Generation (v2.0) ──────────────────

describe('getSilhouetteFromCU', () => {
  it.each(silhouetteTypes)('%s produces non-empty polygon strings from CU', (silhouette) => {
    const cu: BlockDimensionsCU = { width: 2, depth: 2, height: 2 };
    const polygons = getSilhouetteFromCU(silhouette, cu);

    expect(typeof polygons.topFacePoints).toBe('string');
    expect(polygons.topFacePoints.trim().length).toBeGreaterThan(0);
    expect(typeof polygons.leftSidePoints).toBe('string');
    expect(polygons.leftSidePoints.trim().length).toBeGreaterThan(0);
    expect(typeof polygons.rightSidePoints).toBe('string');
    expect(polygons.rightSidePoints.trim().length).toBeGreaterThan(0);
  });

  it.each(silhouetteTypes)('%s output changes with CU height changes', (silhouette) => {
    const low = getSilhouetteFromCU(silhouette, { width: 2, depth: 2, height: 1 });
    const high = getSilhouetteFromCU(silhouette, { width: 2, depth: 2, height: 2 });

    expect(low.leftSidePoints).not.toBe(high.leftSidePoints);
    expect(low.rightSidePoints).not.toBe(high.rightSidePoints);
  });

  it.each(silhouetteTypes)('%s output changes with CU width/depth changes', (silhouette) => {
    const small = getSilhouetteFromCU(silhouette, { width: 1, depth: 1, height: 1 });
    const large = getSilhouetteFromCU(silhouette, { width: 3, depth: 3, height: 1 });

    expect(small.topFacePoints).not.toBe(large.topFacePoints);
  });

  it('produces all 6 tier silhouettes correctly', () => {
    // Every tier from spec §13 should produce valid silhouettes
    const tierCUs: BlockDimensionsCU[] = [
      { width: 1, depth: 1, height: 1 },  // micro
      { width: 2, depth: 2, height: 1 },  // small
      { width: 2, depth: 2, height: 2 },  // medium
      { width: 3, depth: 3, height: 2 },  // large
      { width: 3, depth: 1, height: 1 },  // wide
      { width: 4, depth: 1, height: 1 },  // edge/global
    ];

    for (const cu of tierCUs) {
      for (const silhouette of silhouetteTypes) {
        const polygons = getSilhouetteFromCU(silhouette, cu);
        expect(polygons.topFacePoints.length).toBeGreaterThan(0);
        expect(polygons.leftSidePoints.length).toBeGreaterThan(0);
        expect(polygons.rightSidePoints.length).toBeGreaterThan(0);
      }
    }
  });

  it('produces consistent results with equivalent pixel-based call', () => {
    // CU-based and pixel-based should produce identical polygons
    // when given equivalent dimensions
    const cu: BlockDimensionsCU = { width: 2, depth: 2, height: 2 };
    const dims = cuToSilhouetteDimensions(cu);

    for (const silhouette of silhouetteTypes) {
      const fromCU = getSilhouetteFromCU(silhouette, cu);
      const fromPixels = SILHOUETTE_GENERATORS[silhouette](dims);

      expect(fromCU.topFacePoints).toBe(fromPixels.topFacePoints);
      expect(fromCU.leftSidePoints).toBe(fromPixels.leftSidePoints);
      expect(fromCU.rightSidePoints).toBe(fromPixels.rightSidePoints);
    }
  });

  it('covers every block category via its tier CU dimensions', () => {
    for (const category of blockCategories) {
      const profile = BLOCK_VISUAL_PROFILES[category];
      const tier = CATEGORY_TIER_MAP[category];
      const cu = TIER_DIMENSIONS[tier];

      const polygons = getSilhouetteFromCU(profile.silhouette, cu);
      expect(polygons.topFacePoints.length).toBeGreaterThan(0);
      expect(polygons.leftSidePoints.length).toBeGreaterThan(0);
      expect(polygons.rightSidePoints.length).toBeGreaterThan(0);
    }
  });
});
