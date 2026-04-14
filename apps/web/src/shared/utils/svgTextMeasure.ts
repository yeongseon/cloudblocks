/**
 * SVG text width measurement utility.
 *
 * Uses an off-screen Canvas 2D context for accurate text width measurement
 * without DOM insertion or SVG layout reads. Falls back to a per-character
 * heuristic when canvas is unavailable (e.g. JSDOM/Vitest).
 *
 * Designed for Oracle consultation on Issue #1832.
 */

/** Font specification for measurement. */
export interface SvgTextMeasureSpec {
  fontSize: number;
  fontWeight?: number;
  fontFamily?: string;
}

// ---------------------------------------------------------------------------
// Heuristic fallback factors — match the legacy per-character multipliers
// that were previously inlined in ConnectionRenderer.tsx.
// ---------------------------------------------------------------------------

/** Average character width multiplier for each (fontSize, fontWeight) pair. */
function heuristicCharWidth(fontSize: number, fontWeight: number): number {
  // Legacy values:
  //   11px / 400 → 6.5  (error labels)
  //   10px / 600 → 7.0  (selected type label, top line)
  //   10px / 400 → 6.5  (hover type label)
  //    9px / 400 → 5.5  (selected type label, bottom line — direction)
  if (fontSize >= 11) return 6.5;
  if (fontSize >= 10) return fontWeight >= 600 ? 7.0 : 6.5;
  return 5.5;
}

// ---------------------------------------------------------------------------
// Module-level singleton canvas context + cache
// ---------------------------------------------------------------------------

let ctx: CanvasRenderingContext2D | null | undefined;

/** Lazily create or return the singleton canvas 2D context. */
function getCanvasContext(): CanvasRenderingContext2D | null {
  if (ctx === undefined) {
    try {
      const canvas = document.createElement('canvas');
      ctx = canvas.getContext('2d');
    } catch {
      ctx = null;
    }
  }
  return ctx;
}

const cache = new Map<string, number>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Measure the pixel width of `text` rendered in the given font spec.
 *
 * Uses Canvas 2D `measureText()` when available and caches results.
 * Falls back to a per-character heuristic when canvas is unavailable
 * (JSDOM, SSR, or if `measureText` returns non-positive values).
 *
 * @param text  - The string to measure.
 * @param spec  - Font specification (fontSize, optional fontWeight, fontFamily).
 * @returns The pixel width of the rendered text (ceiled to integer).
 */
export function measureSvgTextWidth(text: string, spec: SvgTextMeasureSpec): number {
  if (text.length === 0) return 0;

  const weight = spec.fontWeight ?? 400;
  const family = spec.fontFamily ?? 'system-ui';
  const cacheKey = `${weight}|${spec.fontSize}|${family}|${text}`;

  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  let width = canvasMeasure(text, spec.fontSize, weight, family);
  if (width <= 0) {
    // Fallback: per-character heuristic
    width = text.length * heuristicCharWidth(spec.fontSize, weight);
  }

  const result = Math.ceil(width);
  cache.set(cacheKey, result);
  return result;
}

/**
 * Clear the measurement cache and reset the canvas context singleton.
 *
 * Call in test `beforeEach()` to ensure deterministic results.
 */
export function clearSvgTextMeasureCache(): void {
  cache.clear();
  ctx = undefined;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

/**
 * Measure text width via Canvas 2D context.
 * Returns 0 if canvas is unavailable.
 */
function canvasMeasure(
  text: string,
  fontSize: number,
  fontWeight: number,
  fontFamily: string,
): number {
  const context = getCanvasContext();
  if (!context) return 0;

  // Canvas font strings do NOT resolve CSS custom properties —
  // always pass a real family name (e.g. 'system-ui').
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

  try {
    const metrics = context.measureText(text);
    return metrics.width;
  } catch {
    return 0;
  }
}
