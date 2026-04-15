// ═══════════════════════════════════════════════════════════════
// Connection Face Color System
// Semantic colors (http, event, data) — NOT provider colors.
// Theme-aware via CSS custom properties defined in index.css.
// ═══════════════════════════════════════════════════════════════

import type { EndpointSemantic } from '@cloudblocks/schema';

// ─── Semantic Subset ─────────────────────────────────────────

/** Supported semantics for rendering. `identity` reserved for future use. */
export type ConnectionRenderSemantic = Extract<EndpointSemantic, 'http' | 'event' | 'data'>;

// ─── Base Color Palette (reference hex for tests & documentation) ───
// Neutralized toward slate so wires recede behind blocks.
// Each semantic retains a faint hue bias as a secondary cue;
// primary differentiation comes from dash patterns (connectionVisualTokens).
export const CONNECTION_SEMANTIC_BASE_COLORS: Record<ConnectionRenderSemantic, string> = {
  http: '#667894', // Faint blue-slate (80% neutralized)
  event: '#787583', // Faint warm-slate (80% neutralized)
  data: '#637e8e', // Faint teal-slate (80% neutralized)
};

// ─── CSS Variable Mapping ───────────────────────────────────
// Actual rendered colors come from CSS custom properties so they
// respond to the active theme (Workshop / Blueprint).

const CONNECTION_CSS_VARS: Record<ConnectionRenderSemantic, { stroke: string; casing: string }> = {
  http: {
    stroke: 'var(--connection-http-stroke, #667894)',
    casing: 'var(--connection-http-casing, #37465b)',
  },
  event: {
    stroke: 'var(--connection-event-stroke, #787583)',
    casing: 'var(--connection-event-casing, #404453)',
  },
  data: {
    stroke: 'var(--connection-data-stroke, #637e8e)',
    casing: 'var(--connection-data-casing, #354959)',
  },
};

// ─── Derived Face + Port Colors ──────────────────────────────

export interface ConnectionColors {
  base: string;
  stroke: string; // inner trace color (CSS var)
  casing: string; // outer casing color (CSS var)
}

export function getConnectionColors(semantic: ConnectionRenderSemantic): ConnectionColors {
  const vars = CONNECTION_CSS_VARS[semantic];
  return {
    base: CONNECTION_SEMANTIC_BASE_COLORS[semantic],
    stroke: vars.stroke,
    casing: vars.casing,
  };
}

export const DEFAULT_CONNECTION_SEMANTIC: ConnectionRenderSemantic = 'http';

// ─── Neutral Colors (dataflow / untyped connections) ────────
// Consumed via --connection-neutral-* CSS tokens in index.css.
// These recede maximally behind blocks — pure slate, no hue bias.
export const NEUTRAL_CONNECTION_COLORS: ConnectionColors = {
  base: '#64748b',
  stroke: 'var(--connection-neutral-stroke, #64748b)',
  casing: 'var(--connection-neutral-casing, #334155)',
};

/**
 * Get colors for a connection, preferring neutral colors
 * when the connection type is 'dataflow' (default) or unresolved.
 */
export function getConnectionColorsForType(
  semantic: ConnectionRenderSemantic,
  isNeutral: boolean,
): ConnectionColors {
  if (isNeutral) return NEUTRAL_CONNECTION_COLORS;
  return getConnectionColors(semantic);
}

// ─── Boundary-Crossing Colors (cross-container scope indicator) ───
// Layered on top of existing semantic/neutral colors — only the casing
// and label styling change, inner trace remains type-specific.

export interface BoundaryColors {
  casing: string;
  anchorRing: string;
  labelFill: string;
  labelStroke: string;
  labelText: string;
}

export const BOUNDARY_CONNECTION_COLORS: BoundaryColors = {
  casing: 'var(--connection-boundary-casing, #4f6f7a)',
  anchorRing: 'var(--connection-boundary-anchor-ring, #7ea7b2)',
  labelFill: 'var(--connection-boundary-label-fill, #e7f1f4)',
  labelStroke: 'var(--connection-boundary-label-stroke, #7ea7b2)',
  labelText: 'var(--connection-boundary-label-text, #35515a)',
};
