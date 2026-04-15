// ═════════════════════════════════════════════════════════════════
// Connection Visual Tokens — single source of truth for
// per-ConnectionType stroke width and dash pattern.
//
// Spec §11.1 (updated — Phase 3 alignment):
//   dataflow  → solid line (default)
//   http      → thicker solid line
//   internal  → medium solid (no dash)
//   data      → thin dash
//   async     → pure dotted
//
// Consumed by:
//   - ConnectionRenderer.tsx (rendering)
//   - validation/connection.ts (re-export for backward compat)
// ═════════════════════════════════════════════════════════════════

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
  dataflow: { strokeWidth: 3.5 },
  http: { strokeWidth: 5.0 },
  internal: { strokeWidth: 4.0 },
  data: { strokeWidth: 3.0, strokeDasharray: '6 3' },
  async: { strokeWidth: 3.25, strokeDasharray: '2 3' },
};

/** Casing width offset added to the base stroke width. */
export const CASING_WIDTH_OFFSET = 2.5;

/** Hover width offset added to the base stroke width. */
export const HOVER_WIDTH_OFFSET = 2.0;

/** Perpendicular offset (screen px) applied to each connection in an overlap group. */
export const OVERLAP_OFFSET_PX = 8;

/** Minimum spacing (px) between lanes in an overlap group. */
export const OVERLAP_LANE_MIN_SPACING_PX = 4;

/** Soft bundle width (px) — total width budget shared among all lanes in a group. */
export const OVERLAP_LANE_SOFT_BUNDLE_WIDTH_PX = 24;

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
