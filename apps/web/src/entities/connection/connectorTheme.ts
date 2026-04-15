import type { ConnectionType, EndpointSemantic } from '@cloudblocks/schema';

export type PinHoleStyle = 'open' | 'filled' | 'cross' | 'double' | 'dashed';

export interface ConnectorTheme {
  tile: string;
  shadow: string;
  dark: string;
  accent: string;
  pinHoleStyle: PinHoleStyle;
}

export const CONNECTOR_THEMES: Record<ConnectionType, ConnectorTheme> = {
  dataflow: {
    tile: '#64748b',
    shadow: '#475569',
    dark: '#334155',
    accent: '#94a3b8',
    pinHoleStyle: 'open',
  },
  http: {
    tile: '#4C78A8',
    shadow: '#3A5F8A',
    dark: '#2C4A6E',
    accent: '#6B9BCF',
    pinHoleStyle: 'filled',
  },
  internal: {
    tile: '#5C97A3',
    shadow: '#4A7E89',
    dark: '#3A6670',
    accent: '#7BB3BF',
    pinHoleStyle: 'cross',
  },
  data: {
    tile: '#5C97A3',
    shadow: '#4A7E89',
    dark: '#3A6670',
    accent: '#7BB3BF',
    pinHoleStyle: 'double',
  },
  async: {
    tile: '#6B86B4',
    shadow: '#536C96',
    dark: '#3E506E',
    accent: '#8BA3CF',
    pinHoleStyle: 'dashed',
  },
};

/**
 * Semantic anchor styles: maps endpoint semantic → pinhole overlay shape.
 * Used by ConnectionRenderer to encode what flows through the endpoint,
 * independent of the connection type (which determines dash pattern).
 */
export const SEMANTIC_ANCHOR_STYLES: Record<EndpointSemantic, PinHoleStyle> = {
  http: 'filled',
  event: 'cross',
  data: 'double',
};

export interface DiffTheme {
  tile: string;
  shadow: string;
  dark: string;
  opacity: number;
}

export const DIFF_THEMES: Record<string, DiffTheme> = {
  added: { tile: '#22c55e', shadow: '#166534', dark: '#14532d', opacity: 1.0 },
  removed: { tile: '#ef4444', shadow: '#991b1b', dark: '#7f1d1d', opacity: 0.4 },
  modified: { tile: '#eab308', shadow: '#854d0e', dark: '#713f12', opacity: 1.0 },
};

export function lightenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const lr = Math.min(255, Math.round(r + (255 - r) * amount));
  const lg = Math.min(255, Math.round(g + (255 - g) * amount));
  const lb = Math.min(255, Math.round(b + (255 - b) * amount));

  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}
