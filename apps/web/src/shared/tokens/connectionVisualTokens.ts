// ═══════════════════════════════════════════════════════════════
// Connection Visual Tokens — single source of truth for
// per-ConnectionType stroke width and dash pattern.
//
// Spec §11.1:
//   dataflow → solid line (default)
//   http     → thicker solid line
//   internal → short dash
//   data     → long dash
//   async    → dot-dash
//
// Consumed by:
//   - ConnectionRenderer.tsx (rendering)
//   - validation/connection.ts (re-export for backward compat)
// ═══════════════════════════════════════════════════════════════

import type { ConnectionType } from '@cloudblocks/schema';

/** Visual style specification for a connection type. */
export interface ConnectionVisualStyle {
  /** Base inner stroke width (px). */
  strokeWidth: number;
  /** SVG stroke-dasharray value. Omit for solid lines. */
  strokeDasharray?: string;
}

/** Per-type visual styles. */
export const CONNECTION_VISUAL_STYLES: Record<ConnectionType, ConnectionVisualStyle> = {
  dataflow: { strokeWidth: 2 },
  http: { strokeWidth: 3 },
  internal: { strokeWidth: 2, strokeDasharray: '4 4' },
  data: { strokeWidth: 2, strokeDasharray: '8 4' },
  async: { strokeWidth: 2, strokeDasharray: '8 4 2 4' },
};

/** Casing width offset added to the base stroke width. */
export const CASING_WIDTH_OFFSET = 2;

/** Hover width offset added to the base stroke width. */
export const HOVER_WIDTH_OFFSET = 1;

/**
 * Resolve the visual style for a connection type.
 * Falls back to 'dataflow' when type is undefined or unrecognized.
 */
export function resolveConnectionVisualStyle(
  type: ConnectionType | undefined,
): ConnectionVisualStyle {
  if (type && Object.hasOwn(CONNECTION_VISUAL_STYLES, type)) {
    return CONNECTION_VISUAL_STYLES[type];
  }
  return CONNECTION_VISUAL_STYLES.dataflow;
}
