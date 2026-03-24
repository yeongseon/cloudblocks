import { describe, expect, it } from 'vitest';

import { BLOCK_MARGIN, BLOCK_PADDING, RENDER_SCALE, TILE_H, TILE_W, TILE_Z } from '../designTokens';

describe('design tokens - RENDER_SCALE derivation chain', () => {
  it('derives RENDER_SCALE as 32 px/CU', () => {
    expect(RENDER_SCALE).toBe(32);
  });

  it('derives tile dimensions from RENDER_SCALE', () => {
    expect(TILE_W).toBe(RENDER_SCALE * 2); // 64
    expect(TILE_H).toBe(RENDER_SCALE); // 32
    expect(TILE_Z).toBe(RENDER_SCALE); // 32
  });

  it('derives block margin/padding from RENDER_SCALE', () => {
    expect(BLOCK_MARGIN).toBe((RENDER_SCALE * 5) / 16); // 10
    expect(BLOCK_PADDING).toBe((RENDER_SCALE * 5) / 16); // 10
  });

  it('matches v1.x production values at RENDER_SCALE=32', () => {
    // These exact values must not change to maintain backward compatibility
    expect(TILE_W).toBe(64);
    expect(TILE_H).toBe(32);
    expect(TILE_Z).toBe(32);
    expect(BLOCK_MARGIN).toBe(10);
    expect(BLOCK_PADDING).toBe(10);
  });
});
