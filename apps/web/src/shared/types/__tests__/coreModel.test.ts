import { describe, expect, it, vi } from 'vitest';

import {
  CONNECTION_TYPE_LABELS,
  SUBTYPE_SIZE_OVERRIDES,
  CATEGORY_TIER_MAP,
  TIER_DIMENSIONS,
  getBlockDimensions,
  getBlockVisualProfile,
} from '../index';
import { BLOCK_VISUAL_PROFILES } from '../visualProfile';
import { makeTestBlock } from '../../../__tests__/legacyModelTestUtils';
import type { ResourceBlock, ConnectionType, ProviderType, ResourceCategory } from '../index';

const blockCategories: ResourceCategory[] = [
  'compute',
  'data',
  'delivery',
  'messaging',
  'network',
  'identity',
  'operations',
  'security',
];

const connectionTypes: ConnectionType[] = ['dataflow', 'http', 'internal', 'data', 'async'];

const providerTypes: ProviderType[] = ['azure', 'aws', 'gcp'];

describe('core model type coverage', () => {
  it('uses azure as default provider in test block factory', () => {
    const block: ResourceBlock = makeTestBlock({
      id: 'blk-legacy-1',
      name: 'Legacy Web App',
      category: 'compute',
      parentId: 'subnet-1',
      position: { x: 1, y: 0.5, z: 1 },
      metadata: {},
    });

    expect(block.provider).toBe('azure');
  });

  it('accepts Block objects with provider set to azure', () => {
    const block: ResourceBlock = makeTestBlock({
      id: 'blk-provider-1',
      name: 'Azure Web App',
      category: 'compute',
      parentId: 'subnet-1',
      position: { x: 2, y: 0.5, z: 2 },
      metadata: {},
      provider: 'azure',
    });

    expect(block.provider).toBe('azure');
  });

  it('accepts Block objects with subtype and config', () => {
    const block: ResourceBlock = makeTestBlock({
      id: 'blk-subtype-1',
      name: 'AWS EC2 Instance',
      category: 'compute',
      parentId: 'subnet-1',
      position: { x: 1, y: 0.5, z: 1 },
      metadata: {},
      provider: 'aws',
      subtype: 'ec2',
      config: { instanceType: 't3.medium', ami: 'ami-12345' },
    });

    expect(block.subtype).toBe('ec2');
    expect(block.config).toEqual({ instanceType: 't3.medium', ami: 'ami-12345' });
  });

  it('accepts Block objects without subtype/config for backward compatibility', () => {
    const block: ResourceBlock = makeTestBlock({
      id: 'blk-nosubtype-1',
      name: 'Generic Compute',
      category: 'compute',
      parentId: 'subnet-1',
      position: { x: 1, y: 0.5, z: 1 },
      metadata: {},
      provider: 'aws',
    });

    expect(block.subtype).toBeUndefined();
    expect(block.config).toBeUndefined();
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

  it('has block footprint in visual profiles for every block category', () => {
    expect(Object.keys(BLOCK_VISUAL_PROFILES).sort()).toEqual([...blockCategories].sort());

    for (const category of blockCategories) {
      const layout = BLOCK_VISUAL_PROFILES[category].footprint;

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

describe('SUBTYPE_SIZE_OVERRIDES', () => {
  it('is intentionally empty after block unification (all blocks use medium tier)', () => {
    expect(Object.keys(SUBTYPE_SIZE_OVERRIDES)).toHaveLength(0);
  });

  it('override map exists for forward-compatibility', () => {
    expect(SUBTYPE_SIZE_OVERRIDES).toBeDefined();
    expect(typeof SUBTYPE_SIZE_OVERRIDES).toBe('object');
  });
});

describe('getBlockDimensions', () => {
  const mediumDims = { width: 2, depth: 2, height: 2 };

  it('returns medium dimensions for any provider+subtype (uniform sizing)', () => {
    expect(getBlockDimensions('compute', 'aws', 'ec2')).toEqual(mediumDims);
    expect(getBlockDimensions('data', 'azure', 'cosmos-db')).toEqual(mediumDims);
    expect(getBlockDimensions('compute', 'gcp', 'cloud-functions')).toEqual(mediumDims);
  });

  it('falls back to medium when subtype is unknown', () => {
    const dims = getBlockDimensions('compute', 'aws', 'UnknownService');
    expect(dims).toEqual(mediumDims);
  });

  it('falls back to medium when provider is undefined', () => {
    const dims = getBlockDimensions('data');
    const expected = TIER_DIMENSIONS[CATEGORY_TIER_MAP['data']];
    expect(dims).toEqual(expected);
    expect(dims).toEqual(mediumDims);
  });

  it('falls back to medium when subtype is undefined', () => {
    const dims = getBlockDimensions('delivery', 'azure');
    const expected = TIER_DIMENSIONS[CATEGORY_TIER_MAP['delivery']];
    expect(dims).toEqual(expected);
    expect(dims).toEqual(mediumDims);
  });

  it('returns uniform medium for all categories', () => {
    for (const category of blockCategories) {
      const dims = getBlockDimensions(category);
      expect(dims, `${category} should be medium (2×2×2)`).toEqual(mediumDims);
    }
  });

  it('falls back to compute tier when category is not mapped', () => {
    const dims = getBlockDimensions('unknown-category' as ResourceCategory);
    expect(dims).toEqual(TIER_DIMENSIONS[CATEGORY_TIER_MAP.compute]);
  });
});

describe('getBlockVisualProfile', () => {
  it('falls back to compute profile for unknown categories', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const profile = getBlockVisualProfile('not-a-category' as ResourceCategory);

    expect(profile).toEqual(BLOCK_VISUAL_PROFILES.compute);
    expect(warnSpy).toHaveBeenCalledWith(
      'Unknown resource category "not-a-category", falling back to "compute" profile.',
    );
  });
});
