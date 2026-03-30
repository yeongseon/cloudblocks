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

export const CONNECTION_SEMANTIC_BASE_COLORS: Record<ConnectionRenderSemantic, string> = {
  http: '#6F87B6', // Muted steel blue
  event: '#C97A63', // Muted terracotta
  data: '#5FA59B', // Muted teal
};

// ─── CSS Variable Mapping ───────────────────────────────────
// Actual rendered colors come from CSS custom properties so they
// respond to the active theme (Workshop / Blueprint).

const CONNECTION_CSS_VARS: Record<ConnectionRenderSemantic, { stroke: string; casing: string }> = {
  http: {
    stroke: 'var(--connection-http-stroke, #6F87B6)',
    casing: 'var(--connection-http-casing, #4E5F7F)',
  },
  event: {
    stroke: 'var(--connection-event-stroke, #C97A63)',
    casing: 'var(--connection-event-casing, #8D5545)',
  },
  data: {
    stroke: 'var(--connection-data-stroke, #5FA59B)',
    casing: 'var(--connection-data-casing, #43746D)',
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
