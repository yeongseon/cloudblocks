import { describe, it, expect } from 'vitest';
import { getBlockWorldAnchors, getBlockSvgPortPoints } from '../blockGeometry';
import type { BlockDimensionsCU } from '../../../shared/types/visualProfile';
import { cuToSilhouetteDimensions } from '../silhouettes';

// ---------------------------------------------------------------------------
// getBlockWorldAnchors
// ---------------------------------------------------------------------------

describe('getBlockWorldAnchors', () => {
  const cu: BlockDimensionsCU = { width: 2, depth: 2, height: 2 };

  it('returns block position as center', () => {
    const anchors = getBlockWorldAnchors([5, 3, 7], cu);
    expect(anchors.center).toEqual([5, 3, 7]);
  });

  it('computes inbound port on the LEFT face (plane x = wx)', () => {
    const anchors = getBlockWorldAnchors([5, 3, 7], cu);
    const port = anchors.port('inbound', 0, 1);
    expect(port).toEqual([5, 3, 8]);
  });

  it('computes outbound port on the RIGHT face (plane z = wz)', () => {
    const anchors = getBlockWorldAnchors([5, 3, 7], cu);
    const port = anchors.port('outbound', 0, 1);
    expect(port).toEqual([6, 3, 7]);
  });

  it('distributes multiple inbound ports evenly', () => {
    const anchors = getBlockWorldAnchors([0, 0, 0], cu);
    const port0 = anchors.port('inbound', 0, 2);
    const port1 = anchors.port('inbound', 1, 2);

    expect(port0[0]).toBe(0);
    expect(port0[2]).toBeCloseTo(2 / 3, 6);
    expect(port1[0]).toBe(0);
    expect(port1[2]).toBeCloseTo(4 / 3, 6);

    expect(port0[1]).toBe(0);
    expect(port1[1]).toBe(0);
  });

  it('distributes multiple outbound ports evenly', () => {
    const anchors = getBlockWorldAnchors([0, 0, 0], cu);
    const port0 = anchors.port('outbound', 0, 2);
    const port1 = anchors.port('outbound', 1, 2);

    expect(port0[2]).toBe(0);
    expect(port0[0]).toBeCloseTo(2 / 3, 6);
    expect(port1[2]).toBe(0);
    expect(port1[0]).toBeCloseTo(4 / 3, 6);

    expect(port0[1]).toBe(0);
    expect(port1[1]).toBe(0);
  });

  it('works with non-square dimensions (wide block)', () => {
    const wideCu: BlockDimensionsCU = { width: 3, depth: 1, height: 1 };
    const anchors = getBlockWorldAnchors([10, 5, 20], wideCu);

    expect(anchors.port('inbound', 0, 1)).toEqual([10, 5, 20.5]);

    expect(anchors.port('outbound', 0, 1)).toEqual([11.5, 5, 20]);
  });

  it('handles micro block (1×1×1)', () => {
    const microCu: BlockDimensionsCU = { width: 1, depth: 1, height: 1 };
    const anchors = getBlockWorldAnchors([0, 0, 0], microCu);

    expect(anchors.port('inbound', 0, 1)).toEqual([0, 0, 0.5]);

    expect(anchors.port('outbound', 0, 1)).toEqual([0.5, 0, 0]);
  });
});

// ---------------------------------------------------------------------------
// getBlockSvgPortPoints
// ---------------------------------------------------------------------------

describe('getBlockSvgPortPoints', () => {
  const cu: BlockDimensionsCU = { width: 2, depth: 2, height: 2 };

  it('returns empty arrays when counts are zero', () => {
    const result = getBlockSvgPortPoints(cu, 0, 0);
    expect(result.inbound).toEqual([]);
    expect(result.outbound).toEqual([]);
  });

  it('returns correct number of inbound and outbound points', () => {
    const result = getBlockSvgPortPoints(cu, 2, 3);
    expect(result.inbound).toHaveLength(2);
    expect(result.outbound).toHaveLength(3);
  });

  it('places inbound ports near the left edge', () => {
    const result = getBlockSvgPortPoints(cu, 1, 0);
    const dims = cuToSilhouetteDimensions(cu);

    expect(result.inbound[0].x).toBe((dims.leftX + dims.cx) / 2);
    expect(result.inbound[0].y).toBe(dims.midY + dims.sideWallPx);
  });

  it('places outbound ports near the right edge', () => {
    const result = getBlockSvgPortPoints(cu, 0, 1);
    const dims = cuToSilhouetteDimensions(cu);

    expect(result.outbound[0].x).toBe((dims.cx + dims.rightX) / 2);
    expect(result.outbound[0].y).toBe(dims.midY + dims.sideWallPx);
  });

  it('distributes ports horizontally along the bottom edge', () => {
    const result = getBlockSvgPortPoints(cu, 2, 0);
    const dims = cuToSilhouetteDimensions(cu);

    const expectedX0 = dims.leftX + (1 / 3) * (dims.cx - dims.leftX);
    const expectedX1 = dims.leftX + (2 / 3) * (dims.cx - dims.leftX);
    const expectedY = dims.midY + dims.sideWallPx;

    expect(result.inbound[0].x).toBeCloseTo(expectedX0, 4);
    expect(result.inbound[1].x).toBeCloseTo(expectedX1, 4);
    expect(result.inbound[0].y).toBe(expectedY);
    expect(result.inbound[1].y).toBe(expectedY);
  });

  it('inbound ports are to the left of outbound ports', () => {
    const result = getBlockSvgPortPoints(cu, 1, 1);
    expect(result.inbound[0].x).toBeLessThan(result.outbound[0].x);
  });

  it('works with asymmetric blocks (wide)', () => {
    const wideCu: BlockDimensionsCU = { width: 3, depth: 1, height: 1 };
    const result = getBlockSvgPortPoints(wideCu, 1, 1);

    expect(result.inbound[0].x).toBeLessThan(result.outbound[0].x);

    const dims = cuToSilhouetteDimensions(wideCu);
    expect(result.inbound[0].x).toBe((dims.leftX + dims.cx) / 2);
    expect(result.outbound[0].x).toBe((dims.cx + dims.rightX) / 2);
    expect(result.inbound[0].y).toBe(dims.midY + dims.sideWallPx);
    expect(result.outbound[0].y).toBe(dims.midY + dims.sideWallPx);
  });
});
