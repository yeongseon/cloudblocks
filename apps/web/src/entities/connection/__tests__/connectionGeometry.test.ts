import { describe, it, expect } from 'vitest';
import {
  buildConnectionFootprint,
  projectFootprintToScreen,
  samplePortPositions,
  getVisibleSideFaces,
} from '../connectionGeometry';
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

function makeRouteFromSegments(points: readonly [number, number][], surfaceY = 3): SurfaceRoute {
  const start = points[0];
  const end = points[points.length - 1];
  const segments = [] as SurfaceRoute['segments'];

  for (let i = 0; i < points.length - 1; i += 1) {
    segments.push({
      start: [points[i][0], surfaceY, points[i][1]],
      end: [points[i + 1][0], surfaceY, points[i + 1][1]],
      kind: 'surface',
    });
  }

  return {
    segments,
    srcPort: {
      surfaceY,
      surfaceBase: [start[0], surfaceY, start[1]],
      surfaceExit: [start[0], surfaceY, start[1]],
      containerId: 'container-1',
      normal: 'neg-z',
    },
    tgtPort: {
      surfaceY,
      surfaceBase: [end[0], surfaceY, end[1]],
      surfaceExit: [end[0], surfaceY, end[1]],
      containerId: 'container-1',
      normal: 'neg-x',
    },
  };
}

describe('connectionGeometry', () => {
  describe('buildConnectionFootprint', () => {
    it('returns empty array for degenerate route (single point)', () => {
      const route = makeStraightRoute(5, 5, 5, 5);
      const footprint = buildConnectionFootprint(route);
      expect(footprint).toHaveLength(0);
    });

    it('returns polygon with >= 4 vertices for straight route', () => {
      const route = makeStraightRoute(0, 0, 5, 0);
      const footprint = buildConnectionFootprint(route);
      expect(footprint.length).toBeGreaterThanOrEqual(4);
    });

    it('returns polygon with >= 6 vertices for L-shaped route', () => {
      const route = makeLRoute(0, 0, 3, 0, 3, 4);
      const footprint = buildConnectionFootprint(route);
      expect(footprint.length).toBeGreaterThanOrEqual(6);
    });

    it('all vertices share the same Y (top surface)', () => {
      const surfaceY = 3;
      const expectedY = surfaceY + 1 / 3;
      const route = makeStraightRoute(0, 0, 5, 0, surfaceY);
      const footprint = buildConnectionFootprint(route);

      for (const vertex of footprint) {
        expect(vertex[1]).toBeCloseTo(expectedY, 5);
      }
    });

    it('polygon is wound counter-clockwise (negative signed area in XZ)', () => {
      const route = makeStraightRoute(0, 0, 5, 0);
      const footprint = buildConnectionFootprint(route);

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
      const footprint = buildConnectionFootprint(route);
      expect(footprint.length).toBeGreaterThanOrEqual(4);
    });

    it('offsets first and last points correctly for vertical straight route', () => {
      const route = makeStraightRoute(0, 0, 0, 4);
      const footprint = buildConnectionFootprint(route);

      expect(footprint).toHaveLength(4);
      expect(footprint[0][0]).toBeCloseTo(-0.5, 5);
      expect(footprint[0][2]).toBeCloseTo(0, 5);
      expect(footprint[1][0]).toBeCloseTo(-0.5, 5);
      expect(footprint[1][2]).toBeCloseTo(4, 5);
      expect(footprint[2][0]).toBeCloseTo(0.5, 5);
      expect(footprint[2][2]).toBeCloseTo(4, 5);
      expect(footprint[3][0]).toBeCloseTo(0.5, 5);
      expect(footprint[3][2]).toBeCloseTo(0, 5);
    });

    it('keeps output winding stable even when route direction is reversed', () => {
      const route = makeStraightRoute(5, 0, 0, 0);
      const footprint = buildConnectionFootprint(route);

      let area = 0;
      for (let i = 0; i < footprint.length; i += 1) {
        const a = footprint[i];
        const b = footprint[(i + 1) % footprint.length];
        area += a[0] * b[2] - b[0] * a[2];
      }
      area /= 2;

      expect(area).toBeLessThanOrEqual(0);
    });

    it('supports segment endpoint aliases (`from` / `to`) during extraction', () => {
      const route = {
        segments: [
          {
            from: [0, 3, 0],
            to: [4, 3, 0],
            kind: 'surface',
          },
        ],
        srcPort: {
          surfaceY: 3,
          surfaceBase: [0, 3, 0],
          surfaceExit: [0, 3, 0],
          containerId: 'container-1',
          normal: 'neg-z',
        },
        tgtPort: {
          surfaceY: 3,
          surfaceBase: [4, 3, 0],
          surfaceExit: [4, 3, 0],
          containerId: 'container-1',
          normal: 'neg-x',
        },
      } as unknown as SurfaceRoute;

      const footprint = buildConnectionFootprint(route);
      expect(footprint.length).toBeGreaterThanOrEqual(4);
    });

    it('supports polyline-style `points` segments and skips invalid segments', () => {
      const route = {
        segments: [
          null,
          {
            points: [
              [0, 3, 0],
              [1, 3, 0],
              [1, 3, 2],
            ],
            kind: 'surface',
          },
        ],
        srcPort: {
          surfaceY: 3,
          surfaceBase: [0, 3, 0],
          surfaceExit: [0, 3, 0],
          containerId: 'container-1',
          normal: 'neg-z',
        },
        tgtPort: {
          surfaceY: 3,
          surfaceBase: [1, 3, 2],
          surfaceExit: [1, 3, 2],
          containerId: 'container-1',
          normal: 'neg-x',
        },
      } as unknown as SurfaceRoute;

      const footprint = buildConnectionFootprint(route);
      expect(footprint.length).toBeGreaterThanOrEqual(4);
    });

    it('handles segment orientation where next segment end matches previous tail', () => {
      const route = makeRouteFromSegments([
        [0, 0],
        [2, 0],
      ]);
      const reversedSecondLeg = {
        ...route,
        segments: [
          { start: [0, 3, 0], end: [2, 3, 0], kind: 'surface' as const },
          { start: [3, 3, 0], end: [2, 3, 0], kind: 'surface' as const },
        ],
        tgtPort: {
          surfaceY: 3,
          surfaceBase: [3, 3, 0],
          surfaceExit: [3, 3, 0],
          containerId: 'container-1',
          normal: 'neg-x',
        },
      } as SurfaceRoute;

      const footprint = buildConnectionFootprint(reversedSecondLeg);
      expect(footprint.length).toBeGreaterThanOrEqual(4);
    });

    it('skips non-extractable segment objects and still forms footprint from valid segments', () => {
      const route = {
        segments: [
          { kind: 'surface' },
          {
            start: [0, 3, 0],
            end: [2, 3, 0],
            kind: 'surface',
          },
        ],
        srcPort: {
          surfaceY: 3,
          surfaceBase: [0, 3, 0],
          surfaceExit: [0, 3, 0],
          containerId: 'container-1',
          normal: 'neg-z',
        },
        tgtPort: {
          surfaceY: 3,
          surfaceBase: [2, 3, 0],
          surfaceExit: [2, 3, 0],
          containerId: 'container-1',
          normal: 'neg-x',
        },
      } as unknown as SurfaceRoute;

      const footprint = buildConnectionFootprint(route);
      expect(footprint).toHaveLength(4);
    });

    it('keeps polyline continuity when second segment is reversed toward prior endpoint', () => {
      const route = {
        segments: [
          { start: [0, 3, 0], end: [2, 3, 0], kind: 'surface' as const },
          { start: [4, 3, 0], end: [2, 3, 0], kind: 'surface' as const },
          { start: [4, 3, 0], end: [4, 3, 2], kind: 'surface' as const },
        ],
        srcPort: {
          surfaceY: 3,
          surfaceBase: [0, 3, 0],
          surfaceExit: [0, 3, 0],
          containerId: 'container-1',
          normal: 'neg-z',
        },
        tgtPort: {
          surfaceY: 3,
          surfaceBase: [4, 3, 2],
          surfaceExit: [4, 3, 2],
          containerId: 'container-1',
          normal: 'neg-x',
        },
      } as SurfaceRoute;

      const footprint = buildConnectionFootprint(route);
      expect(footprint.length).toBeGreaterThanOrEqual(6);
    });

    it('normalizes winding to counter-clockwise for mixed segment ordering', () => {
      const route = {
        segments: [
          { start: [3, 3, 3], end: [3, 3, 0], kind: 'surface' as const },
          { start: [0, 3, 0], end: [3, 3, 0], kind: 'surface' as const },
        ],
        srcPort: {
          surfaceY: 3,
          surfaceBase: [0, 3, 0],
          surfaceExit: [0, 3, 0],
          containerId: 'container-1',
          normal: 'neg-z',
        },
        tgtPort: {
          surfaceY: 3,
          surfaceBase: [3, 3, 3],
          surfaceExit: [3, 3, 3],
          containerId: 'container-1',
          normal: 'neg-x',
        },
      } as SurfaceRoute;

      const footprint = buildConnectionFootprint(route);
      let area = 0;
      for (let i = 0; i < footprint.length; i += 1) {
        const a = footprint[i];
        const b = footprint[(i + 1) % footprint.length];
        area += a[0] * b[2] - b[0] * a[2];
      }

      expect(area / 2).toBeLessThanOrEqual(0);
    });
  });

  describe('projectFootprintToScreen', () => {
    it('returns same number of screen points as world vertices', () => {
      const route = makeStraightRoute(0, 0, 3, 0);
      const footprint = buildConnectionFootprint(route);
      const screen = projectFootprintToScreen(footprint, 400, 300);
      expect(screen).toHaveLength(footprint.length);
    });

    it('each screen point has x and y properties', () => {
      const route = makeStraightRoute(0, 0, 3, 0);
      const footprint = buildConnectionFootprint(route);
      const screen = projectFootprintToScreen(footprint, 400, 300);

      for (const point of screen) {
        expect(typeof point.x).toBe('number');
        expect(typeof point.y).toBe('number');
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.y)).toBe(true);
      }
    });
  });

  describe('samplePortPositions', () => {
    it('returns empty for short route (< 1 CU)', () => {
      const route = makeStraightRoute(0, 0, 0.5, 0);
      const ports = samplePortPositions(route);
      expect(ports).toHaveLength(0);
    });

    it('returns empty when route polyline cannot be formed', () => {
      const route = makeStraightRoute(2, 2, 2, 2);
      const ports = samplePortPositions(route);
      expect(ports).toHaveLength(0);
    });

    it('returns ports for 2 CU route', () => {
      const route = makeStraightRoute(0, 0, 2, 0);
      const ports = samplePortPositions(route);
      expect(ports).toHaveLength(1);
      expect(ports[0][0]).toBeCloseTo(1, 5);
      expect(ports[0][2]).toBeCloseTo(0, 5);
    });

    it('returns ports along a 5 CU straight route', () => {
      const route = makeStraightRoute(0, 0, 5, 0);
      const ports = samplePortPositions(route);
      expect(ports.length).toBeGreaterThanOrEqual(1);
    });

    it('ports are at top Y (surfaceY + CONNECTION_HEIGHT_CU)', () => {
      const surfaceY = 3;
      const expectedY = surfaceY + 1 / 3;
      const route = makeStraightRoute(0, 0, 5, 0, surfaceY);
      const ports = samplePortPositions(route);

      for (const portPos of ports) {
        expect(portPos[1]).toBeCloseTo(expectedY, 5);
      }
    });

    it('avoids bends in L-route', () => {
      const route = makeLRoute(0, 0, 3, 0, 3, 4);
      const ports = samplePortPositions(route);

      for (const portPos of ports) {
        const distToBendX = Math.abs(portPos[0] - 3);
        const distToBendZ = Math.abs(portPos[2] - 0);
        if (distToBendX < 0.01 && distToBendZ < 0.01) {
          expect(false).toBe(true);
        }
      }
    });

    it('uses midpoint fallback when regular sampling yields no ports and total length is >= 2', () => {
      const route = makeRouteFromSegments(
        [
          [0, 0],
          [2, 0],
        ],
        3,
      );
      const ports = samplePortPositions(route);

      expect(ports).toHaveLength(1);
      expect(ports[0][0]).toBeCloseTo(1, 5);
      expect(ports[0][2]).toBeCloseTo(0, 5);
    });

    it('does not place midpoint fallback port when midpoint is near a bend', () => {
      const route = makeRouteFromSegments(
        [
          [0, 0],
          [1, 0],
          [1, 1],
        ],
        3,
      );
      const ports = samplePortPositions(route);

      expect(ports).toHaveLength(0);
    });

    it('places midpoint fallback port when bends exist but midpoint is not near a bend', () => {
      const route = makeRouteFromSegments(
        [
          [0, 0],
          [2, 0],
          [2, 0.2],
        ],
        3,
      );
      const ports = samplePortPositions(route);

      expect(ports).toHaveLength(1);
      expect(ports[0][0]).toBeCloseTo(1.1, 5);
      expect(ports[0][2]).toBeCloseTo(0, 5);
    });

    it('returns empty when total route length is just below one CU', () => {
      const route = makeStraightRoute(0, 0, 0.999, 0);
      const studs = samplePortPositions(route);

      expect(studs).toEqual([]);
    });

    it('skips midpoint fallback when midpoint lies near bend threshold', () => {
      const route = makeRouteFromSegments(
        [
          [0, 0],
          [1.5, 0],
          [1.5, 1],
        ],
        3,
      );
      const studs = samplePortPositions(route);

      expect(studs).toHaveLength(0);
    });
  });

  describe('getVisibleSideFaces', () => {
    it('returns empty for degenerate footprint (< 3 vertices)', () => {
      const faces = getVisibleSideFaces([], 3.333, 3);
      expect(faces).toHaveLength(0);
    });

    it('returns empty when footprint has one or two vertices only', () => {
      expect(getVisibleSideFaces([[0, 3.333, 0]], 3.333, 3)).toEqual([]);
      expect(
        getVisibleSideFaces(
          [
            [0, 3.333, 0],
            [1, 3.333, 0],
          ],
          3.333,
          3,
        ),
      ).toEqual([]);
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
