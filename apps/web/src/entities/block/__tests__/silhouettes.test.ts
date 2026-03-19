import { describe, expect, it } from 'vitest';

import { SILHOUETTE_GENERATORS } from '../silhouettes';
import {
  BLOCK_VISUAL_PROFILES,
  type BlockCategory,
  type BrickSilhouette,
  type BrickSizeTier,
} from '../../../shared/types/index';

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
