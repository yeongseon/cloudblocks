import { describe, expect, it } from 'vitest';

import {
  BLOCK_MARGIN,
  BLOCK_PADDING,
  RENDER_SCALE,
  STUD_HEIGHT,
  STUD_INNER_RX,
  STUD_INNER_RY,
  STUD_RX,
  STUD_RY,
  TILE_H,
  TILE_W,
  TILE_Z,
} from '../designTokens';


describe('design tokens - RENDER_SCALE derivation chain', () => {
  it('derives RENDER_SCALE as 32 px/CU', () => {
    expect(RENDER_SCALE).toBe(32);
  });

  it('derives tile dimensions from RENDER_SCALE', () => {
    expect(TILE_W).toBe(RENDER_SCALE * 2);  // 64
    expect(TILE_H).toBe(RENDER_SCALE);       // 32
    expect(TILE_Z).toBe(RENDER_SCALE);       // 32
  });

  it('derives block margin/padding from RENDER_SCALE', () => {
    expect(BLOCK_MARGIN).toBe(RENDER_SCALE * 5 / 16);  // 10
    expect(BLOCK_PADDING).toBe(RENDER_SCALE * 5 / 16); // 10
  });

  it('derives stud geometry from RENDER_SCALE (Universal Stud Standard)', () => {
    expect(STUD_RX).toBe(RENDER_SCALE * 3 / 8);       // 12
    expect(STUD_RY).toBe(STUD_RX / 2);                 // 6
    expect(STUD_HEIGHT).toBe(RENDER_SCALE * 5 / 32);   // 5
    expect(STUD_INNER_RX).toBe(RENDER_SCALE * 9 / 40); // 7.2  (= STUD_RX × 0.6, integer-friendly)
    expect(STUD_INNER_RY).toBe(RENDER_SCALE * 9 / 80); // 3.6  (= STUD_INNER_RX / 2)
  });

  it('matches v1.x production values at RENDER_SCALE=32', () => {
    // These exact values must not change to maintain backward compatibility
    expect(TILE_W).toBe(64);
    expect(TILE_H).toBe(32);
    expect(TILE_Z).toBe(32);
    expect(STUD_RX).toBe(12);
    expect(STUD_RY).toBe(6);
    expect(STUD_HEIGHT).toBe(5);
    expect(STUD_INNER_RX).toBeCloseTo(7.2);
    expect(STUD_INNER_RY).toBeCloseTo(3.6);
    expect(BLOCK_MARGIN).toBe(10);
    expect(BLOCK_PADDING).toBe(10);
  });
});
