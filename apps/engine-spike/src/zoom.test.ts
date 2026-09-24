import { describe, expect, it } from 'vitest';
import { clampZoom, MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from './zoom';

describe('study zoom bounds', () => {
  it('keeps the camera and SVG viewport in the same supported range', () => {
    expect(clampZoom(MIN_ZOOM - ZOOM_STEP)).toBe(MIN_ZOOM);
    expect(clampZoom(MAX_ZOOM + ZOOM_STEP)).toBe(MAX_ZOOM);
    expect(clampZoom(1 + ZOOM_STEP)).toBe(1.2);
    expect(clampZoom(Number.NaN)).toBe(1);
  });
});
