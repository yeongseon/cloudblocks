import { describe, it, expect } from 'vitest';

import {
  ELEV_Y,
  GRID_CELL,
  ISO_X,
  ISO_Y,
  SCALE,
  depthKey,
  screenDeltaToWorld,
  screenToWorld,
  snapToGrid,
  worldSizeToScreen,
  worldToScreen,
} from './isometric';

describe('isometric constants', () => {
  it('exports expected projection and grid constants', () => {
    expect(SCALE).toBe(64);
    expect(GRID_CELL).toBe(3);
    expect(ISO_X).toBe(64);
    expect(ISO_Y).toBe(32);
    expect(ELEV_Y).toBe(32);
  });
});

describe('worldToScreen', () => {
  it('maps origin world coordinates to origin screen coordinates', () => {
    expect(worldToScreen(0, 0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('applies projection formula with origin offsets and mixed signs', () => {
    expect(worldToScreen(10, 2, -4, 100, 200)).toEqual({
      x: 548,
      y: 232,
    });
  });

  it('handles large coordinates', () => {
    expect(worldToScreen(1_000, 500, 1_000)).toEqual({ x: 0, y: 16_000 });
  });
});

describe('screenToWorld', () => {
  it('converts projected screen coordinates back to world plane values', () => {
    const screen = worldToScreen(4.5, 0, -1.25, 20, -30);
    const world = screenToWorld(screen.x, screen.y, 0, 20, -30);
    expect(world.worldX).toBeCloseTo(4.5);
    expect(world.worldZ).toBeCloseTo(-1.25);
  });

  it('supports non-zero worldY and non-zero origin offsets', () => {
    const worldX = -6.75;
    const worldY = 3.25;
    const worldZ = 8.5;
    const originX = -120;
    const originY = 999;
    const screen = worldToScreen(worldX, worldY, worldZ, originX, originY);
    const restored = screenToWorld(screen.x, screen.y, worldY, originX, originY);

    expect(restored.worldX).toBeCloseTo(worldX);
    expect(restored.worldZ).toBeCloseTo(worldZ);
  });

  it('preserves world coordinates through multiple round-trip cases', () => {
    const cases = [
      { x: 0, y: 0, z: 0, ox: 0, oy: 0 },
      { x: -10, y: 2, z: 5, ox: 0, oy: 0 },
      { x: 1234.5, y: -42, z: -987.25, ox: 300, oy: -200 },
      { x: 1 / 3, y: 7.125, z: -2 / 3, ox: -512, oy: 1024 },
    ];

    for (const { x, y, z, ox, oy } of cases) {
      const screen = worldToScreen(x, y, z, ox, oy);
      const world = screenToWorld(screen.x, screen.y, y, ox, oy);
      expect(world.worldX).toBeCloseTo(x);
      expect(world.worldZ).toBeCloseTo(z);
    }
  });
});

describe('screenDeltaToWorld', () => {
  it('converts zero delta to zero world delta', () => {
    expect(screenDeltaToWorld(0, 0)).toEqual({ dWorldX: 0, dWorldZ: 0 });
  });

  it('converts positive and negative screen deltas correctly', () => {
    expect(screenDeltaToWorld(64, 32)).toEqual({ dWorldX: 2, dWorldZ: 0 });
    expect(screenDeltaToWorld(-32, 96)).toEqual({ dWorldX: 2.5, dWorldZ: 3.5 });
  });

  it('matches screenToWorld displacement between two screen points', () => {
    const p1 = { x: 10, y: -20 };
    const p2 = { x: 170, y: 44 };
    const delta = screenDeltaToWorld(p2.x - p1.x, p2.y - p1.y);
    const w1 = screenToWorld(p1.x, p1.y);
    const w2 = screenToWorld(p2.x, p2.y);

    expect(w2.worldX - w1.worldX).toBeCloseTo(delta.dWorldX);
    expect(w2.worldZ - w1.worldZ).toBeCloseTo(delta.dWorldZ);
  });
});

describe('depthKey', () => {
  it('returns integer key with default layer and worldY', () => {
    expect(depthKey(1, 2)).toBe(300);
  });

  it('separates layers by one million and includes worldY', () => {
    expect(depthKey(3, 4, 5, 2)).toBe(2_001_200);
  });

  it('rounds fractional frontness consistently', () => {
    expect(depthKey(0.125, 0.125, 0, 1)).toBe(1_000_025);
    expect(depthKey(-0.125, -0.125, 0, 0)).toBe(-25);
  });
});

describe('worldSizeToScreen', () => {
  it('returns zero dimensions for empty world size', () => {
    expect(worldSizeToScreen(0, 0, 0)).toEqual({ screenWidth: 0, screenHeight: 0 });
  });

  it('converts world dimensions to isometric bounding dimensions', () => {
    expect(worldSizeToScreen(4, 2, 3)).toEqual({
      screenWidth: 224,
      screenHeight: 176,
    });
  });

  it('handles large dimensions', () => {
    expect(worldSizeToScreen(1_000, 500, 1_000)).toEqual({
      screenWidth: 64_000,
      screenHeight: 48_000,
    });
  });
});

describe('snapToGrid', () => {
  it('returns unchanged values for exact grid multiples', () => {
    expect(snapToGrid(6, -9)).toEqual({ x: 6, z: -9 });
  });

  it('snaps positive and negative values to nearest grid cell', () => {
    expect(snapToGrid(7.49, 7.51)).toEqual({ x: 6, z: 9 });
    expect(snapToGrid(-4.4, -4.6)).toEqual({ x: -3, z: -6 });
  });

  it('uses Math.round tie behavior on half-cell boundaries', () => {
    expect(snapToGrid(1.5, 4.5)).toEqual({ x: 3, z: 6 });
  });
});
