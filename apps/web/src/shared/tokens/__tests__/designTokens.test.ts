import { describe, expect, it } from 'vitest';

import {
  BLOCK_MARGIN,
  BLOCK_PADDING,
  LABEL_FACE_MIN_PX,
  LABEL_FACE_SCALE,
  RENDER_SCALE,
  TILE_H,
  TILE_W,
  TILE_Z,
} from '../designTokens';

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

describe('design tokens - face label typography', () => {
  it('exports LABEL_FACE_MIN_PX as 8', () => {
    expect(LABEL_FACE_MIN_PX).toBe(8);
  });

  it('exports LABEL_FACE_SCALE as 0.28', () => {
    expect(LABEL_FACE_SCALE).toBe(0.28);
  });

  it('face label formula produces floor value for small walls', () => {
    // sideWallPx = 16 → 16 * 0.28 = 4.48 → round = 4 → clamped to 8
    const fontSize = Math.max(LABEL_FACE_MIN_PX, Math.round(16 * LABEL_FACE_SCALE));
    expect(fontSize).toBe(8);
  });

  it('face label formula scales up for large walls', () => {
    // sideWallPx = 64 → 64 * 0.28 = 17.92 → round = 18 → above floor
    const fontSize = Math.max(LABEL_FACE_MIN_PX, Math.round(64 * LABEL_FACE_SCALE));
    expect(fontSize).toBe(18);
  });

  it('face label formula works at typical block sideWallPx (64)', () => {
    // Standard medium block: height=2, TILE_Z=32 → sideWallPx=64
    const sideWallPx = Math.round(2 * TILE_Z);
    const fontSize = Math.max(LABEL_FACE_MIN_PX, Math.round(sideWallPx * LABEL_FACE_SCALE));
    expect(fontSize).toBe(18); // 64 * 0.28 = 17.92 → 18
  });

  it('face label formula works at typical container sideWallPx (16)', () => {
    // Standard subnet container: worldHeight=0.5, TILE_Z=32 → sideWallPx=16
    const sideWallPx = Math.round(0.5 * TILE_Z);
    const fontSize = Math.max(LABEL_FACE_MIN_PX, Math.round(sideWallPx * LABEL_FACE_SCALE));
    expect(fontSize).toBe(8); // 16 * 0.28 = 4.48 → floor 8
  });

  it('face label formula works at region container sideWallPx (22)', () => {
    // Region container: worldHeight=0.7, TILE_Z=32 → sideWallPx=22
    const sideWallPx = Math.round(0.7 * TILE_Z);
    const fontSize = Math.max(LABEL_FACE_MIN_PX, Math.round(sideWallPx * LABEL_FACE_SCALE));
    expect(fontSize).toBe(8); // 22 * 0.28 = 6.16 → round 6 → floor 8
  });
});
