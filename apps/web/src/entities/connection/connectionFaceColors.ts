// ═══════════════════════════════════════════════════════════════
// Connection Brick Face Color System
// Semantic colors (http, event, data) — NOT provider colors.
// Reuses deriveFaceColors() from blockFaceColors.ts (§7.7).
// ═══════════════════════════════════════════════════════════════

import type { EndpointSemantic } from '@cloudblocks/schema';
import type { StudColorSpec } from '../../shared/types/index';
import { deriveFaceColors } from '../block/blockFaceColors';

// ─── Semantic Subset ─────────────────────────────────────────

/** Supported semantics for rendering. `identity` reserved for future use. */
export type ConnectionRenderSemantic = Extract<EndpointSemantic, 'http' | 'event' | 'data'>;

// ─── Base Color Palette ──────────────────────────────────────

export const CONNECTION_SEMANTIC_BASE_COLORS: Record<ConnectionRenderSemantic, string> = {
  http: '#6366F1', // Indigo
  event: '#F43F5E', // Rose
  data: '#84CC16', // Lime
};

// ─── Derived Face + Stud Colors ──────────────────────────────

export interface ConnectionBrickColors {
  base: string;
  topFaceColor: string;
  topFaceStroke: string;
  leftSideColor: string;
  rightSideColor: string;
  studColors: StudColorSpec;
}

export function getConnectionBrickColors(
  semantic: ConnectionRenderSemantic,
): ConnectionBrickColors {
  const base = CONNECTION_SEMANTIC_BASE_COLORS[semantic];
  const derived = deriveFaceColors(base);

  return {
    base,
    topFaceColor: derived.top,
    topFaceStroke: derived.topStroke,
    leftSideColor: derived.left,
    rightSideColor: derived.right,
    studColors: {
      main: derived.studMain,
      shadow: derived.studShadow,
      highlight: derived.studHighlight,
    },
  };
}

export const DEFAULT_CONNECTION_SEMANTIC: ConnectionRenderSemantic = 'http';
