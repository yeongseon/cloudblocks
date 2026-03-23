import { describe, expect, it } from 'vitest';
import {
  buildBrickFootprint,
  getVisibleSideFaces,
  projectFootprintToScreen,
  sampleStudPositions,
} from '../connectionBrickGeometry';

function makeRoute(
  points: readonly [[number, number, number], [number, number, number]][],
  surfaceY = 0,
): Parameters<typeof buildBrickFootprint>[0] {
  return {
    srcPort: { surfaceY },
    segments: points.map(([start, end]) => ({ start, end })),
  } as unknown as Parameters<typeof buildBrickFootprint>[0];
}

describe('buildBrickFootprint', () => {
  it('builds a 4-point rectangle for straight horizontal routes', () => {
    const route = makeRoute([
      [
        [0, 0, 0],
        [4, 0, 0],
      ],
    ]);
    const footprint = buildBrickFootprint(route);

    expect(footprint).toEqual([
      [0, 1 / 3, 0.5],
      [4, 1 / 3, 0.5],
      [4, 1 / 3, -0.5],
      [0, 1 / 3, -0.5],
    ]);
  });

  it('builds a 4-point rectangle for straight vertical routes', () => {
    const route = makeRoute([
      [
        [0, 0, 0],
        [0, 0, 4],
      ],
    ]);
    const footprint = buildBrickFootprint(route);

    expect(footprint).toEqual([
      [-0.5, 1 / 3, 0],
      [-0.5, 1 / 3, 4],
      [0.5, 1 / 3, 4],
      [0.5, 1 / 3, 0],
    ]);
  });

  it('builds a 6-point clockwise polygon for L-shaped routes', () => {
    const route = makeRoute([
      [
        [0, 0, 0],
        [3, 0, 0],
      ],
      [
        [3, 0, 0],
        [3, 0, 2],
      ],
    ]);
    const footprint = buildBrickFootprint(route);

    expect(footprint).toHaveLength(6);
    expect(footprint).toEqual([
      [0, 1 / 3, 0.5],
      [2.5, 1 / 3, 0.5],
      [2.5, 1 / 3, 2],
      [3.5, 1 / 3, 2],
      [3.5, 1 / 3, -0.5],
      [0, 1 / 3, -0.5],
    ]);
  });

  it('handles very short routes (< 1 CU)', () => {
    const route = makeRoute([
      [
        [0, 0, 0],
        [0.75, 0, 0],
      ],
    ]);
    const footprint = buildBrickFootprint(route);

    expect(footprint).toEqual([
      [0, 1 / 3, 0.5],
      [0.75, 1 / 3, 0.5],
      [0.75, 1 / 3, -0.5],
      [0, 1 / 3, -0.5],
    ]);
  });
});

describe('projectFootprintToScreen', () => {
  it('projects world vertices through worldToScreen', () => {
    const screen = projectFootprintToScreen(
      [
        [1, 0, 1],
        [2, 1, 0],
      ],
      100,
      200,
    );

    expect(screen).toEqual([
      { x: 100, y: 232 },
      { x: 164, y: 200 },
    ]);
  });
});

describe('sampleStudPositions', () => {
  it('returns empty array for routes shorter than 1 CU', () => {
    const route = makeRoute([
      [
        [0, 0, 0],
        [0.75, 0, 0],
      ],
    ]);
    expect(sampleStudPositions(route)).toEqual([]);
  });

  it('returns one stud at midpoint for a 2 CU route', () => {
    const route = makeRoute([
      [
        [0, 0, 0],
        [2, 0, 0],
      ],
    ]);
    expect(sampleStudPositions(route)).toEqual([[1, 1 / 3, 0]]);
  });

  it('returns multiple studs at 1 CU intervals for a 5 CU route', () => {
    const route = makeRoute([
      [
        [0, 0, 0],
        [5, 0, 0],
      ],
    ]);
    expect(sampleStudPositions(route)).toEqual([
      [1.5, 1 / 3, 0],
      [2.5, 1 / 3, 0],
      [3.5, 1 / 3, 0],
    ]);
  });

  it('skips stud positions near bends on L-routes', () => {
    const route = makeRoute([
      [
        [0, 0, 0],
        [3, 0, 0],
      ],
      [
        [3, 0, 0],
        [3, 0, 3],
      ],
    ]);

    expect(sampleStudPositions(route)).toEqual([
      [1.5, 1 / 3, 0],
      [3, 1 / 3, 1.5],
    ]);
  });
});

describe('getVisibleSideFaces', () => {
  it('returns two visible side faces for clockwise rectangle top polygon', () => {
    const top: readonly [number, number, number][] = [
      [0, 1, 1],
      [4, 1, 1],
      [4, 1, 0],
      [0, 1, 0],
    ];

    const faces = getVisibleSideFaces(top, 1, 0);
    expect(faces).toHaveLength(2);
    expect(faces.map((f) => f.face)).toEqual(['left', 'right']);

    expect(faces[0].vertices).toEqual([
      [0, 1, 1],
      [4, 1, 1],
      [4, 0, 1],
      [0, 0, 1],
    ]);

    expect(faces[1].vertices).toEqual([
      [4, 1, 1],
      [4, 1, 0],
      [4, 0, 0],
      [4, 0, 1],
    ]);
  });
});
