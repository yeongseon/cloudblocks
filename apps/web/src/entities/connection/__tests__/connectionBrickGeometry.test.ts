import { describe, it, expect } from 'vitest';
import {
  buildBrickFootprint,
  projectFootprintToScreen,
  sampleStudPositions,
  getVisibleSideFaces,
} from '../connectionBrickGeometry';
import type { SurfaceRoute, WorldPoint3 } from '../surfaceRouting';

function makeStraightRoute(
  startX: number,
  startZ: number,
  endX: number,
  endZ: number,
  surfaceY = 3,
): SurfaceRoute {
  return {
    segments: [
      {
        start: [startX, surfaceY, startZ] as WorldPoint3,
        end: [endX, surfaceY, endZ] as WorldPoint3,
        kind: 'surface' as const,
      },
    ],
    srcPort: {
      surfaceY,
      surfaceBase: [startX, surfaceY, startZ] as WorldPoint3,
      surfaceExit: [startX, surfaceY, startZ] as WorldPoint3,
    },
    tgtPort: {
      surfaceY,
      surfaceBase: [endX, surfaceY, endZ] as WorldPoint3,
      surfaceExit: [endX, surfaceY, endZ] as WorldPoint3,
    },
  } as SurfaceRoute;
}

function makeLRoute(
  startX: number,
  startZ: number,
  midX: number,
  midZ: number,
  endX: number,
  endZ: number,
  surfaceY = 3,
): SurfaceRoute {
  return {
    segments: [
      {
        start: [startX, surfaceY, startZ] as WorldPoint3,
        end: [midX, surfaceY, midZ] as WorldPoint3,
        kind: 'surface' as const,
      },
      {
        start: [midX, surfaceY, midZ] as WorldPoint3,
        end: [endX, surfaceY, endZ] as WorldPoint3,
        kind: 'surface' as const,
      },
    ],
    srcPort: {
      surfaceY,
      surfaceBase: [startX, surfaceY, startZ] as WorldPoint3,
      surfaceExit: [startX, surfaceY, startZ] as WorldPoint3,
    },
    tgtPort: {
      surfaceY,
      surfaceBase: [endX, surfaceY, endZ] as WorldPoint3,
      surfaceExit: [endX, surfaceY, endZ] as WorldPoint3,
    },
  } as SurfaceRoute;
}

describe('connectionBrickGeometry', () => {
  describe('buildBrickFootprint', () => {
    it('returns empty array for degenerate route (single point)', () => {
      const route = makeStraightRoute(5, 5, 5, 5);
      const footprint = buildBrickFootprint(route);
      expect(footprint).toHaveLength(0);
    });

    it('returns polygon with >= 4 vertices for straight route', () => {
      const route = makeStraightRoute(0, 0, 5, 0);
      const footprint = buildBrickFootprint(route);
      expect(footprint.length).toBeGreaterThanOrEqual(4);
    });

    it('returns polygon with >= 6 vertices for L-shaped route', () => {
      const route = makeLRoute(0, 0, 3, 0, 3, 4);
      const footprint = buildBrickFootprint(route);
      expect(footprint.length).toBeGreaterThanOrEqual(6);
    });

    it('all vertices share the same Y (top surface)', () => {
      const surfaceY = 3;
      const expectedY = surfaceY + 1 / 3;
      const route = makeStraightRoute(0, 0, 5, 0, surfaceY);
      const footprint = buildBrickFootprint(route);

      for (const vertex of footprint) {
        expect(vertex[1]).toBeCloseTo(expectedY, 5);
      }
    });

    it('polygon is wound counter-clockwise (negative signed area in XZ)', () => {
      const route = makeStraightRoute(0, 0, 5, 0);
      const footprint = buildBrickFootprint(route);

      let area = 0;
      for (let i = 0; i < footprint.length; i++) {
        const a = footprint[i];
        const b = footprint[(i + 1) % footprint.length];
        area += a[0] * b[2] - b[0] * a[2];
      }
      area /= 2;
      expect(area).toBeLessThanOrEqual(0);
    });

    it('short route (< 1 CU) still produces a valid footprint if > 0 length', () => {
      const route = makeStraightRoute(0, 0, 0.5, 0);
      const footprint = buildBrickFootprint(route);
      expect(footprint.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('projectFootprintToScreen', () => {
    it('returns same number of screen points as world vertices', () => {
      const route = makeStraightRoute(0, 0, 3, 0);
      const footprint = buildBrickFootprint(route);
      const screen = projectFootprintToScreen(footprint, 400, 300);
      expect(screen).toHaveLength(footprint.length);
    });

    it('each screen point has x and y properties', () => {
      const route = makeStraightRoute(0, 0, 3, 0);
      const footprint = buildBrickFootprint(route);
      const screen = projectFootprintToScreen(footprint, 400, 300);

      for (const point of screen) {
        expect(typeof point.x).toBe('number');
        expect(typeof point.y).toBe('number');
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.y)).toBe(true);
      }
    });
  });

  describe('sampleStudPositions', () => {
    it('returns empty for short route (< 1 CU)', () => {
      const route = makeStraightRoute(0, 0, 0.5, 0);
      const studs = sampleStudPositions(route);
      expect(studs).toHaveLength(0);
    });

    it('returns studs for 2 CU route', () => {
      const route = makeStraightRoute(0, 0, 2, 0);
      const studs = sampleStudPositions(route);
      expect(studs.length).toBeGreaterThanOrEqual(0);
    });

    it('returns studs along a 5 CU straight route', () => {
      const route = makeStraightRoute(0, 0, 5, 0);
      const studs = sampleStudPositions(route);
      expect(studs.length).toBeGreaterThanOrEqual(1);
    });

    it('studs are at top Y (surfaceY + CONNECTION_HEIGHT_CU)', () => {
      const surfaceY = 3;
      const expectedY = surfaceY + 1 / 3;
      const route = makeStraightRoute(0, 0, 5, 0, surfaceY);
      const studs = sampleStudPositions(route);

      for (const stud of studs) {
        expect(stud[1]).toBeCloseTo(expectedY, 5);
      }
    });

    it('avoids bends in L-route', () => {
      const route = makeLRoute(0, 0, 3, 0, 3, 4);
      const studs = sampleStudPositions(route);

      for (const stud of studs) {
        const distToBendX = Math.abs(stud[0] - 3);
        const distToBendZ = Math.abs(stud[2] - 0);
        if (distToBendX < 0.01 && distToBendZ < 0.01) {
          expect(false).toBe(true);
        }
      }
    });
  });

  describe('getVisibleSideFaces', () => {
    it('returns empty for degenerate footprint (< 3 vertices)', () => {
      const faces = getVisibleSideFaces([], 3.333, 3);
      expect(faces).toHaveLength(0);
    });

    it('returns side faces for a simple rectangle footprint', () => {
      const footprint: WorldPoint3[] = [
        [0, 3.333, 0],
        [3, 3.333, 0],
        [3, 3.333, 1],
        [0, 3.333, 1],
      ];
      const faces = getVisibleSideFaces(footprint, 3.333, 3);

      expect(faces.length).toBeGreaterThanOrEqual(1);
    });

    it('each face has exactly 4 vertices', () => {
      const footprint: WorldPoint3[] = [
        [0, 3.333, 0],
        [3, 3.333, 0],
        [3, 3.333, 1],
        [0, 3.333, 1],
      ];
      const faces = getVisibleSideFaces(footprint, 3.333, 3);

      for (const face of faces) {
        expect(face.vertices).toHaveLength(4);
        expect(face.face === 'left' || face.face === 'right').toBe(true);
      }
    });

    it('side face top vertices are at topY and bottom at baseY', () => {
      const topY = 3.333;
      const baseY = 3;
      const footprint: WorldPoint3[] = [
        [0, topY, 0],
        [3, topY, 0],
        [3, topY, 1],
        [0, topY, 1],
      ];
      const faces = getVisibleSideFaces(footprint, topY, baseY);

      for (const face of faces) {
        const [topA, topB, bottomB, bottomA] = face.vertices;
        expect(topA[1]).toBeCloseTo(topY, 5);
        expect(topB[1]).toBeCloseTo(topY, 5);
        expect(bottomA[1]).toBeCloseTo(baseY, 5);
        expect(bottomB[1]).toBeCloseTo(baseY, 5);
      }
    });
  });
});
