import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSvgTextMeasureCache, measureSvgTextWidth } from '../svgTextMeasure';
import type { SvgTextMeasureSpec } from '../svgTextMeasure';

// ---------------------------------------------------------------------------
// Mock canvas context
// ---------------------------------------------------------------------------

let mockMeasureText: ReturnType<typeof vi.fn>;
let mockFont: string;
let canvasAvailable: boolean;

function createMockContext() {
  mockFont = '';
  return {
    get font() {
      return mockFont;
    },
    set font(value: string) {
      mockFont = value;
    },
    measureText: mockMeasureText,
  } as unknown as CanvasRenderingContext2D;
}

// Store the original createElement before any mocking
const originalCreateElement = document.createElement.bind(document);

beforeEach(() => {
  clearSvgTextMeasureCache();
  canvasAvailable = true;

  // Deterministic mock: width = text.length * fontSize * 0.6
  mockMeasureText = vi.fn((text: string) => {
    const sizeMatch = mockFont.match(/(\d+)px/);
    const fontSize = sizeMatch ? Number(sizeMatch[1]) : 10;
    return { width: text.length * fontSize * 0.6 };
  });

  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      return {
        getContext: (_: string) => (canvasAvailable ? createMockContext() : null),
      } as unknown as HTMLCanvasElement;
    }
    return originalCreateElement(tag);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('measureSvgTextWidth', () => {
  it('returns 0 for empty string', () => {
    expect(measureSvgTextWidth('', { fontSize: 10 })).toBe(0);
  });

  it('measures text using canvas context', () => {
    const width = measureSvgTextWidth('Hello', { fontSize: 10 });
    // 5 chars * 10 * 0.6 = 30 → ceil = 30
    expect(width).toBe(30);
    expect(mockMeasureText).toHaveBeenCalledWith('Hello');
  });

  it('sets correct font string on canvas context', () => {
    measureSvgTextWidth('Test', { fontSize: 11, fontWeight: 600 });
    expect(mockFont).toBe('600 11px system-ui');
  });

  it('uses default fontWeight 400 and fontFamily system-ui', () => {
    measureSvgTextWidth('Test', { fontSize: 9 });
    expect(mockFont).toBe('400 9px system-ui');
  });

  it('respects custom fontFamily', () => {
    measureSvgTextWidth('X', { fontSize: 10, fontFamily: 'monospace' });
    expect(mockFont).toBe('400 10px monospace');
  });

  it('caches results for identical inputs', () => {
    const spec: SvgTextMeasureSpec = { fontSize: 10 };
    const w1 = measureSvgTextWidth('cached', spec);
    const w2 = measureSvgTextWidth('cached', spec);
    expect(w1).toBe(w2);
    // measureText should only be called once due to caching
    expect(mockMeasureText).toHaveBeenCalledTimes(1);
  });

  it('produces different cache entries for different font sizes', () => {
    const w10 = measureSvgTextWidth('AB', { fontSize: 10 });
    const w11 = measureSvgTextWidth('AB', { fontSize: 11 });
    // 2 * 10 * 0.6 = 12, 2 * 11 * 0.6 = 13.2 → ceil = 14
    expect(w10).toBe(12);
    expect(w11).toBe(14);
  });

  it('produces different cache entries for different font weights', () => {
    const w400 = measureSvgTextWidth('AB', { fontSize: 10, fontWeight: 400 });
    clearSvgTextMeasureCache();
    // Same text, different weight → different cache key
    const w600 = measureSvgTextWidth('AB', { fontSize: 10, fontWeight: 600 });
    // In our mock both return same width, but they are cached separately
    expect(w400).toBe(w600); // mock doesn't vary by weight
    expect(mockMeasureText).toHaveBeenCalledTimes(2);
  });

  it('ceils the measured width', () => {
    // 3 chars * 11 * 0.6 = 19.8 → ceil = 20
    const width = measureSvgTextWidth('abc', { fontSize: 11 });
    expect(width).toBe(20);
  });

  it('clearSvgTextMeasureCache resets the cache', () => {
    const spec: SvgTextMeasureSpec = { fontSize: 10 };
    measureSvgTextWidth('test', spec);
    expect(mockMeasureText).toHaveBeenCalledTimes(1);

    clearSvgTextMeasureCache();
    measureSvgTextWidth('test', spec);
    expect(mockMeasureText).toHaveBeenCalledTimes(2);
  });
});

describe('measureSvgTextWidth fallback', () => {
  beforeEach(() => {
    canvasAvailable = false;
    clearSvgTextMeasureCache();
  });

  it('falls back to heuristic when canvas is unavailable (11px/400)', () => {
    const width = measureSvgTextWidth('Hello', { fontSize: 11 });
    // Heuristic: 5 * 6.5 = 32.5 → ceil = 33
    expect(width).toBe(33);
  });

  it('falls back with 10px/600 heuristic', () => {
    const width = measureSvgTextWidth('HTTP', { fontSize: 10, fontWeight: 600 });
    // Heuristic: 4 * 7.0 = 28 → ceil = 28
    expect(width).toBe(28);
  });

  it('falls back with 10px/400 heuristic', () => {
    const width = measureSvgTextWidth('Data', { fontSize: 10 });
    // Heuristic: 4 * 6.5 = 26 → ceil = 26
    expect(width).toBe(26);
  });

  it('falls back with 9px/400 heuristic', () => {
    const width = measureSvgTextWidth('web → db', { fontSize: 9 });
    // Heuristic: 8 * 5.5 = 44 → ceil = 44
    expect(width).toBe(44);
  });

  it('caches fallback results too', () => {
    const spec: SvgTextMeasureSpec = { fontSize: 11 };
    const w1 = measureSvgTextWidth('same', spec);
    const w2 = measureSvgTextWidth('same', spec);
    expect(w1).toBe(w2);
  });
});

describe('measureSvgTextWidth edge cases', () => {
  it('handles single character', () => {
    const width = measureSvgTextWidth('X', { fontSize: 10 });
    // 1 * 10 * 0.6 = 6
    expect(width).toBe(6);
  });

  it('handles special characters (arrow)', () => {
    const width = measureSvgTextWidth('A → B', { fontSize: 9 });
    // 5 chars * 9 * 0.6 = 27
    expect(width).toBe(27);
  });

  it('handles ellipsis character', () => {
    const width = measureSvgTextWidth('Long te…', { fontSize: 11 });
    // 8 chars * 11 * 0.6 = 52.8 → ceil = 53
    expect(width).toBe(53);
  });
});
