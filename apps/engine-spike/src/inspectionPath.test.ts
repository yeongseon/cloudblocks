import { describe, expect, it } from 'vitest';
import { inspectionPath } from './inspectionPath';

describe('inspection overlay path', () => {
  it('places the shared corridor above both projected endpoints', () => {
    const route = inspectionPath([340, 240], [670, 310], 68);
    expect(route.laneY).toBe(172);
    expect(route.label).toEqual([505, 160]);
    expect(route.path).toContain('L 670 310');
  });

  it('keeps the corridor inside the viewport for high endpoints', () => {
    expect(inspectionPath([100, 55], [200, 220], 70).laneY).toBe(30);
  });
});
