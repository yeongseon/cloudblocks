import { describe, expect, it } from 'vitest';

import {
  STUD_HEIGHT,
  BLOCK_WORLD_HEIGHT,
  STUD_RX,
  STUD_RY,
  TIER_HEIGHTS,
  TILE_H,
  TILE_W,
  TILE_Z,
  getBlockWorldHeight,
} from '../designTokens';
import { BLOCK_VISUAL_PROFILES, type BlockCategory, type BrickSizeTier } from '../../types/index';

const blockCategories: BlockCategory[] = [
  'compute',
  'database',
  'storage',
  'gateway',
  'function',
  'queue',
  'event',
  'timer',
];

const sizeTiers: BrickSizeTier[] = ['signal', 'light', 'service', 'core', 'anchor'];

const tierScales: Record<BrickSizeTier, number> = {
  signal: 0.5,
  light: 0.6,
  service: 0.8,
  core: 1.0,
  anchor: 1.2,
};

describe('design tokens - heights', () => {
  it('defines TIER_HEIGHTS for all expected tiers', () => {
    expect(Object.keys(TIER_HEIGHTS).sort()).toEqual([...sizeTiers].sort());
  });

  it('uses expected height scale values per tier', () => {
    expect(TIER_HEIGHTS).toEqual(tierScales);
  });

  it('returns correct per-category height scale from visual profile tier', () => {
    for (const category of blockCategories) {
      const expectedTier = BLOCK_VISUAL_PROFILES[category].tier;
      expect(getBlockWorldHeight(category)).toBe(tierScales[expectedTier]);
    }
  });

  it('supports deriving absolute world height from base height and tier scale', () => {
    for (const category of blockCategories) {
      const tier = BLOCK_VISUAL_PROFILES[category].tier;
      const absoluteHeight = BLOCK_WORLD_HEIGHT * getBlockWorldHeight(category);
      expect(absoluteHeight).toBe(BLOCK_WORLD_HEIGHT * tierScales[tier]);
    }
  });
});

describe('design tokens - core dimensions and stud compliance', () => {
  it('uses expected tile dimensions', () => {
    expect(TILE_W).toBe(64);
    expect(TILE_H).toBe(32);
    expect(TILE_Z).toBe(32);
  });

  it('keeps universal stud rx/ry dimensions consistent', () => {
    expect(STUD_RX).toBe(12);
    expect(STUD_RY).toBe(6);
  });

  it('validates stud height constant for shadow offset', () => {
    expect(STUD_HEIGHT).toBe(5);
  });

  it('validates stud height constant for shadow offset', () => {
    expect(STUD_HEIGHT).toBe(5);
  });
});
