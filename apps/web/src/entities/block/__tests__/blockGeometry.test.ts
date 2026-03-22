import { describe, it, expect } from 'vitest';
import { getBlockWorldAnchors, getBlockSvgStubPoints } from '../blockGeometry';
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

  it('computes inbound stub on the LEFT face (plane x = wx)', () => {
    // Inbound, single stub (index=0, total=1) → t = 0.5
    // Expected: [wx, wy + 0.5 * height, wz + depth/2]
    //         = [5, 3 + 0.5 * 2, 7 + 2/2] = [5, 4, 8]
    const anchors = getBlockWorldAnchors([5, 3, 7], cu);
    const stub = anchors.stub('inbound', 0, 1);
    expect(stub).toEqual([5, 4, 8]);
  });

  it('computes outbound stub on the RIGHT face (plane z = wz)', () => {
    // Outbound, single stub (index=0, total=1) → t = 0.5
    // Expected: [wx + width/2, wy + 0.5 * height, wz]
    //         = [5 + 1, 3 + 1, 7] = [6, 4, 7]
    const anchors = getBlockWorldAnchors([5, 3, 7], cu);
    const stub = anchors.stub('outbound', 0, 1);
    expect(stub).toEqual([6, 4, 7]);
  });

  it('distributes multiple inbound stubs evenly', () => {
    // 2 inbound stubs: t0 = 1/3, t1 = 2/3
    const anchors = getBlockWorldAnchors([0, 0, 0], cu);
    const stub0 = anchors.stub('inbound', 0, 2);
    const stub1 = anchors.stub('inbound', 1, 2);

    // Both on LEFT face (x=0), depth midpoint (z = depth/2 = 1)
    expect(stub0[0]).toBe(0); // wx
    expect(stub0[2]).toBe(1); // wz + depth/2
    expect(stub1[0]).toBe(0);
    expect(stub1[2]).toBe(1);

    // Vertical distribution: y0 = 0 + (1/3)*2, y1 = 0 + (2/3)*2
    expect(stub0[1]).toBeCloseTo(2 / 3, 6);
    expect(stub1[1]).toBeCloseTo(4 / 3, 6);
  });

  it('distributes multiple outbound stubs evenly', () => {
    // 2 outbound stubs: t0 = 1/3, t1 = 2/3
    const anchors = getBlockWorldAnchors([0, 0, 0], cu);
    const stub0 = anchors.stub('outbound', 0, 2);
    const stub1 = anchors.stub('outbound', 1, 2);

    // Both on RIGHT face (z=0), width midpoint (x = width/2 = 1)
    expect(stub0[2]).toBe(0); // wz
    expect(stub0[0]).toBe(1); // wx + width/2
    expect(stub1[2]).toBe(0);
    expect(stub1[0]).toBe(1);

    // Vertical distribution
    expect(stub0[1]).toBeCloseTo(2 / 3, 6);
    expect(stub1[1]).toBeCloseTo(4 / 3, 6);
  });

  it('works with non-square dimensions (wide block)', () => {
    const wideCu: BlockDimensionsCU = { width: 3, depth: 1, height: 1 };
    const anchors = getBlockWorldAnchors([10, 5, 20], wideCu);

    // Inbound single stub: [10, 5 + 0.5*1, 20 + 1/2] = [10, 5.5, 20.5]
    expect(anchors.stub('inbound', 0, 1)).toEqual([10, 5.5, 20.5]);

    // Outbound single stub: [10 + 3/2, 5 + 0.5*1, 20] = [11.5, 5.5, 20]
    expect(anchors.stub('outbound', 0, 1)).toEqual([11.5, 5.5, 20]);
  });

  it('handles micro block (1×1×1)', () => {
    const microCu: BlockDimensionsCU = { width: 1, depth: 1, height: 1 };
    const anchors = getBlockWorldAnchors([0, 0, 0], microCu);

    // Inbound: [0, 0.5, 0.5]
    expect(anchors.stub('inbound', 0, 1)).toEqual([0, 0.5, 0.5]);

    // Outbound: [0.5, 0.5, 0]
    expect(anchors.stub('outbound', 0, 1)).toEqual([0.5, 0.5, 0]);
  });
});

// ---------------------------------------------------------------------------
// getBlockSvgStubPoints
// ---------------------------------------------------------------------------

describe('getBlockSvgStubPoints', () => {
  const cu: BlockDimensionsCU = { width: 2, depth: 2, height: 2 };

  it('returns empty arrays when counts are zero', () => {
    const result = getBlockSvgStubPoints(cu, 0, 0);
    expect(result.inbound).toEqual([]);
    expect(result.outbound).toEqual([]);
  });

  it('returns correct number of inbound and outbound points', () => {
    const result = getBlockSvgStubPoints(cu, 2, 3);
    expect(result.inbound).toHaveLength(2);
    expect(result.outbound).toHaveLength(3);
  });

  it('places inbound stubs near the left edge', () => {
    const result = getBlockSvgStubPoints(cu, 1, 0);
    const dims = cuToSilhouetteDimensions(cu);
    const FACE_INSET_PX = 3;

    // Single inbound stub at t=0.5, x = leftX + inset
    expect(result.inbound[0].x).toBe(dims.leftX + FACE_INSET_PX);
  });

  it('places outbound stubs near the right edge', () => {
    const result = getBlockSvgStubPoints(cu, 0, 1);
    const dims = cuToSilhouetteDimensions(cu);
    const FACE_INSET_PX = 3;

    // Single outbound stub at t=0.5, x = rightX - inset
    expect(result.outbound[0].x).toBe(dims.rightX - FACE_INSET_PX);
  });

  it('distributes stubs vertically between midY and midY+sideWallPx', () => {
    const result = getBlockSvgStubPoints(cu, 2, 0);
    const dims = cuToSilhouetteDimensions(cu);

    // 2 stubs: t0 = 1/3, t1 = 2/3 along the side wall
    const wallHeight = dims.sideWallPx;
    const expectedY0 = dims.midY + (1 / 3) * wallHeight;
    const expectedY1 = dims.midY + (2 / 3) * wallHeight;

    expect(result.inbound[0].y).toBeCloseTo(expectedY0, 4);
    expect(result.inbound[1].y).toBeCloseTo(expectedY1, 4);
  });

  it('inbound stubs are to the left of outbound stubs', () => {
    const result = getBlockSvgStubPoints(cu, 1, 1);
    expect(result.inbound[0].x).toBeLessThan(result.outbound[0].x);
  });

  it('works with asymmetric blocks (wide)', () => {
    const wideCu: BlockDimensionsCU = { width: 3, depth: 1, height: 1 };
    const result = getBlockSvgStubPoints(wideCu, 1, 1);

    // Should still have left < right
    expect(result.inbound[0].x).toBeLessThan(result.outbound[0].x);

    // Verify x positions are near edges
    const dims = cuToSilhouetteDimensions(wideCu);
    expect(result.inbound[0].x).toBe(dims.leftX + 3);
    expect(result.outbound[0].x).toBe(dims.rightX - 3);
  });
});
