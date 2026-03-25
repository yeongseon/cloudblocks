// ═══════════════════════════════════════════════════════════════
// Connection Face Color System
// Semantic colors (http, event, data) — NOT provider colors.
// Reuses deriveFaceColors() from blockFaceColors.ts (§7.7).
// ═══════════════════════════════════════════════════════════════

import type { EndpointSemantic } from '@cloudblocks/schema';

// ─── Semantic Subset ─────────────────────────────────────────

/** Supported semantics for rendering. `identity` reserved for future use. */
export type ConnectionRenderSemantic = Extract<EndpointSemantic, 'http' | 'event' | 'data'>;

// ─── Base Color Palette ──────────────────────────────────────

export const CONNECTION_SEMANTIC_BASE_COLORS: Record<ConnectionRenderSemantic, string> = {
  http: '#6F87B6', // Muted steel blue
  event: '#C97A63', // Muted terracotta
  data: '#5FA59B', // Muted teal
};

// ─── Derived Face + Port Colors ──────────────────────────────

export interface ConnectionColors {
  base: string;
  stroke: string; // inner trace color
  casing: string; // outer casing color (darker)
}

export function getConnectionColors(semantic: ConnectionRenderSemantic): ConnectionColors {
  const base = CONNECTION_SEMANTIC_BASE_COLORS[semantic];
  // Derive casing by darkening the base by ~30%
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  const darken = (v: number) => Math.round(v * 0.7);
  const casing = `#${darken(r).toString(16).padStart(2, '0')}${darken(g).toString(16).padStart(2, '0')}${darken(b).toString(16).padStart(2, '0')}`;

  return {
    base,
    stroke: base,
    casing,
  };
}

export const DEFAULT_CONNECTION_SEMANTIC: ConnectionRenderSemantic = 'http';
