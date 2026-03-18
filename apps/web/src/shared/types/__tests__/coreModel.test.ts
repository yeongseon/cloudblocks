import { describe, expect, it } from 'vitest';

import {
  CONNECTION_TYPE_LABELS,
  STUD_LAYOUTS,
} from '../index';
import type {
  Block,
  BlockCategory,
  ConnectionType,
  ProviderType,
} from '../index';

const blockCategories: BlockCategory[] = [
  'compute',
  'database',
  'storage',
  'gateway',
  'function',
  'queue',
  'event',
  'timer',
];

const connectionTypes: ConnectionType[] = [
  'dataflow',
  'http',
  'internal',
  'data',
  'async',
];

const providerTypes: ProviderType[] = ['azure', 'aws', 'gcp'];

describe('core model type coverage', () => {
  it('accepts Block objects without provider for backward compatibility', () => {
    const block: Block = {
      id: 'blk-legacy-1',
      name: 'Legacy Web App',
      category: 'compute',
      placementId: 'subnet-1',
      position: { x: 1, y: 0.5, z: 1 },
      metadata: {},
    };

    expect(block.provider).toBeUndefined();
    expect('provider' in block).toBe(false);
  });

  it('accepts Block objects with provider set to azure', () => {
    const block: Block = {
      id: 'blk-provider-1',
      name: 'Azure Web App',
      category: 'compute',
      placementId: 'subnet-1',
      position: { x: 2, y: 0.5, z: 2 },
      metadata: {},
      provider: 'azure',
    };

    expect(block.provider).toBe('azure');
  });

  it('defines all connection types and labels', () => {
    expect(connectionTypes).toHaveLength(5);
    expect(Object.keys(CONNECTION_TYPE_LABELS).sort()).toEqual([...connectionTypes].sort());
  });

  it('has non-empty labels for every connection type', () => {
    for (const type of connectionTypes) {
      const label = CONNECTION_TYPE_LABELS[type];

      expect(typeof label).toBe('string');
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });

  it('has stud layout tuples for every block category', () => {
    expect(Object.keys(STUD_LAYOUTS).sort()).toEqual([...blockCategories].sort());

    for (const category of blockCategories) {
      const layout = STUD_LAYOUTS[category];

      expect(layout).toBeDefined();
      expect(layout).toHaveLength(2);
      expect(Number.isInteger(layout[0])).toBe(true);
      expect(Number.isInteger(layout[1])).toBe(true);
      expect(layout[0]).toBeGreaterThan(0);
      expect(layout[1]).toBeGreaterThan(0);
    }
  });

  it('supports azure, aws, and gcp as ProviderType values', () => {
    const allowedProviders: Record<ProviderType, true> = {
      azure: true,
      aws: true,
      gcp: true,
    };

    expect(providerTypes.every((provider) => allowedProviders[provider])).toBe(true);
    expect(providerTypes).toEqual(['azure', 'aws', 'gcp']);
  });
});
