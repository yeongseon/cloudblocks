// CloudBlocks Domain — Layer hierarchy rules
// Defines which layer types can be nested inside which other layer types.
// Used by both container nodes (kind='container') and leaf nodes (kind='resource').

import type { LayerType } from '@cloudblocks/schema';

/**
 * Valid parent layer types for each layer in the containment hierarchy.
 *
 * An empty array means the layer can only appear at root level.
 * Example: a 'zone' plate can only be placed inside a 'region' plate.
 *
 * This constant is the single source of truth for placement validation
 * in both frontend (validation engine) and backend (rule_engine.py).
 */
export const VALID_PARENTS: Record<LayerType, LayerType[]> = {
  global: [],           // root level
  edge: [],             // root level
  region: ['global'],   // or root
  zone: ['region'],
  subnet: ['zone', 'region'],
  resource: ['subnet', 'zone', 'region', 'edge', 'global'],
};
