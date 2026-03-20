// CloudBlocks Domain — Human-readable labels and role constants
// Shared between frontend UI and backend API responses.

import type { BlockRole, ConnectionType } from '@cloudblocks/schema';

/**
 * Human-readable display labels for connection types.
 * Used in tooltips, property panels, and validation messages.
 */
export const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  dataflow: 'Data Flow',
  http: 'HTTP',
  internal: 'Internal',
  data: 'Data',
  async: 'Async',
};

/**
 * All valid block roles as a readonly tuple.
 * Used for iteration, validation, and UI dropdowns.
 */
export const BLOCK_ROLES: readonly BlockRole[] = [
  'primary',
  'secondary',
  'reader',
  'writer',
  'public',
  'private',
  'internal',
  'external',
] as const;
