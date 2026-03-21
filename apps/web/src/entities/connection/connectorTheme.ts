import type { ConnectionType } from '@cloudblocks/schema';

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
    tile: '#3b82f6',
    shadow: '#2563eb',
    dark: '#1d4ed8',
    accent: '#60a5fa',
    pinHoleStyle: 'filled',
  },
  internal: {
    tile: '#8b5cf6',
    shadow: '#7c3aed',
    dark: '#6d28d9',
    accent: '#a78bfa',
    pinHoleStyle: 'cross',
  },
  data: {
    tile: '#f59e0b',
    shadow: '#d97706',
    dark: '#b45309',
    accent: '#fbbf24',
    pinHoleStyle: 'double',
  },
  async: {
    tile: '#10b981',
    shadow: '#059669',
    dark: '#047857',
    accent: '#34d399',
    pinHoleStyle: 'dashed',
  },
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
