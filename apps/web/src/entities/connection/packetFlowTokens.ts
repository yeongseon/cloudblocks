export const PACKET_SPEED_MS = 2600;
export const PACKET_LENGTH = 10;
export const PACKET_WIDTH = 4;
export const PACKET_TAIL_LENGTH = 6;

export const SHORT_PATH_THRESHOLD = 80;
export const MEDIUM_PATH_THRESHOLD = 180;

export const PACKET_OPACITY = {
  hover: 0.5,
  selected: 0.8,
  creation: 1.0,
} as const;

export const PACKET_COLOR = '#22d3ee';
export const PACKET_GLOW_COLOR = 'rgba(34, 211, 238, 0.3)';

/** Duration of the creation burst effect in milliseconds. Matches PACKET_SPEED_MS so
 *  the burst visual completes exactly when the timer clears the burst entry. */
export const CREATION_BURST_DURATION_MS = PACKET_SPEED_MS;
