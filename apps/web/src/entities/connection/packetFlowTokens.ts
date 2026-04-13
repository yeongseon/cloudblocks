import type { ConnectionType } from '@cloudblocks/schema';

export const PACKET_SPEED_MS = 2600;
export const PACKET_LENGTH = 12;
export const PACKET_WIDTH = 5;
export const PACKET_TAIL_LENGTH = 14;

export const SHORT_PATH_THRESHOLD = 80;
export const MEDIUM_PATH_THRESHOLD = 180;

export const PACKET_OPACITY = {
  idle: 0.42,
  hover: 0.5,
  selected: 0.8,
  creation: 1.0,
} as const;

export const IDLE_CYCLE_MS = 3600;

export const PACKET_COLOR = '#22d3ee';
export const PACKET_GLOW_COLOR = 'rgba(34, 211, 238, 0.3)';

// ─── Semantic Packet Colors (two-layer: halo + core) ────────
// Halo provides contrast on light backgrounds, core on dark.
export interface PacketColorPair {
  halo: string;
  core: string;
}

export const SEMANTIC_PACKET_COLORS: Record<ConnectionType, PacketColorPair> = {
  http: { halo: '#0284C7', core: '#7DD3FC' },
  async: { halo: '#8B5CF6', core: '#C4B5FD' },
  data: { halo: '#0D9488', core: '#5EEAD4' },
  dataflow: { halo: '#B45309', core: '#FCD34D' },
  internal: { halo: '#64748B', core: '#E2E8F0' },
};

/** Duration of the creation burst effect in milliseconds. Matches PACKET_SPEED_MS so
 *  the burst visual completes exactly when the timer clears the burst entry. */
export const CREATION_BURST_DURATION_MS = PACKET_SPEED_MS;
