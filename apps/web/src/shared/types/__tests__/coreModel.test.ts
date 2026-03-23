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
import type { LeafNode, ConnectionType, ProviderType, ResourceCategory } from '../index';

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
    const block: LeafNode = makeTestBlock({
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
    const block: LeafNode = makeTestBlock({
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
    const block: LeafNode = makeTestBlock({
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
    const block: LeafNode = makeTestBlock({
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

  it('has stud footprint in visual profiles for every block category', () => {
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
  it('contains all AWS subtypes from spec §6.1 (21 entries)', () => {
    const awsKeys = Object.keys(SUBTYPE_SIZE_OVERRIDES).filter((k) => k.startsWith('aws:'));
    expect(awsKeys).toHaveLength(21);
  });

  it('contains all Azure subtypes from spec §6.2 (17 entries)', () => {
    const azureKeys = Object.keys(SUBTYPE_SIZE_OVERRIDES).filter((k) => k.startsWith('azure:'));
    expect(azureKeys).toHaveLength(17);
  });

  it('contains all GCP subtypes from spec §6.3 (17 entries)', () => {
    const gcpKeys = Object.keys(SUBTYPE_SIZE_OVERRIDES).filter((k) => k.startsWith('gcp:'));
    expect(gcpKeys).toHaveLength(17);
  });

  it('all override values have positive integer CU dimensions', () => {
    for (const [key, dims] of Object.entries(SUBTYPE_SIZE_OVERRIDES)) {
      expect(Number.isInteger(dims.width), `${key} width`).toBe(true);
      expect(Number.isInteger(dims.depth), `${key} depth`).toBe(true);
      expect(Number.isInteger(dims.height), `${key} height`).toBe(true);
      expect(dims.width, `${key} width > 0`).toBeGreaterThan(0);
      expect(dims.depth, `${key} depth > 0`).toBeGreaterThan(0);
      expect(dims.height, `${key} height > 0`).toBeGreaterThan(0);
    }
  });

  it('uses provider:Subtype key format for all entries', () => {
    const validPrefixes = ['aws:', 'azure:', 'gcp:'];
    for (const key of Object.keys(SUBTYPE_SIZE_OVERRIDES)) {
      const hasValidPrefix = validPrefixes.some((p) => key.startsWith(p));
      expect(hasValidPrefix, `key '${key}' should start with aws:, azure:, or gcp:`).toBe(true);
    }
  });

  it('maps specific AWS subtypes to expected dimensions', () => {
    expect(SUBTYPE_SIZE_OVERRIDES['aws:ec2']).toEqual({ width: 2, depth: 2, height: 2 });
    expect(SUBTYPE_SIZE_OVERRIDES['aws:lambda']).toEqual({ width: 1, depth: 1, height: 1 });
    expect(SUBTYPE_SIZE_OVERRIDES['aws:rds-postgres']).toEqual({ width: 3, depth: 3, height: 2 });
    expect(SUBTYPE_SIZE_OVERRIDES['aws:cloudfront']).toEqual({ width: 4, depth: 1, height: 1 });
  });

  it('maps specific Azure subtypes to expected dimensions', () => {
    expect(SUBTYPE_SIZE_OVERRIDES['azure:vm']).toEqual({ width: 2, depth: 2, height: 2 });
    expect(SUBTYPE_SIZE_OVERRIDES['azure:functions']).toEqual({ width: 1, depth: 1, height: 1 });
    expect(SUBTYPE_SIZE_OVERRIDES['azure:cosmos-db']).toEqual({ width: 3, depth: 3, height: 2 });
    expect(SUBTYPE_SIZE_OVERRIDES['azure:front-door']).toEqual({ width: 4, depth: 1, height: 1 });
  });

  it('maps specific GCP subtypes to expected dimensions', () => {
    expect(SUBTYPE_SIZE_OVERRIDES['gcp:compute-engine']).toEqual({ width: 2, depth: 2, height: 2 });
    expect(SUBTYPE_SIZE_OVERRIDES['gcp:cloud-functions']).toEqual({
      width: 1,
      depth: 1,
      height: 1,
    });
    expect(SUBTYPE_SIZE_OVERRIDES['gcp:cloud-sql-postgres']).toEqual({
      width: 3,
      depth: 3,
      height: 2,
    });
    expect(SUBTYPE_SIZE_OVERRIDES['gcp:cloud-cdn']).toEqual({ width: 4, depth: 1, height: 1 });
  });
});

describe('getBlockDimensions', () => {
  it('returns subtype override when provider and subtype match', () => {
    const dims = getBlockDimensions('compute', 'aws', 'ec2');
    expect(dims).toEqual({ width: 2, depth: 2, height: 2 });
  });

  it('returns subtype override for Azure subtypes', () => {
    const dims = getBlockDimensions('data', 'azure', 'cosmos-db');
    expect(dims).toEqual({ width: 3, depth: 3, height: 2 });
  });

  it('returns subtype override for GCP subtypes', () => {
    const dims = getBlockDimensions('compute', 'gcp', 'cloud-functions');
    expect(dims).toEqual({ width: 1, depth: 1, height: 1 });
  });

  it('falls back to category default when subtype is unknown', () => {
    const dims = getBlockDimensions('compute', 'aws', 'UnknownService');
    // compute → medium tier → { width: 2, depth: 2, height: 2 }
    const expected = TIER_DIMENSIONS[CATEGORY_TIER_MAP['compute']];
    expect(dims).toEqual(expected);
  });

  it('falls back to category default when provider is undefined', () => {
    const dims = getBlockDimensions('data');
    // database → large tier → { width: 3, depth: 3, height: 2 }
    const expected = TIER_DIMENSIONS[CATEGORY_TIER_MAP['data']];
    expect(dims).toEqual(expected);
  });

  it('falls back to category default when subtype is undefined', () => {
    const dims = getBlockDimensions('delivery', 'azure');
    // gateway → wide tier → { width: 3, depth: 1, height: 1 }
    const expected = TIER_DIMENSIONS[CATEGORY_TIER_MAP['delivery']];
    expect(dims).toEqual(expected);
  });

  it('returns correct defaults for all 10 categories', () => {
    for (const category of blockCategories) {
      const dims = getBlockDimensions(category);
      const tier = CATEGORY_TIER_MAP[category];
      const expected = TIER_DIMENSIONS[tier];
      expect(dims, `${category} should map to ${tier} tier`).toEqual(expected);
    }
  });

  it('subtype override can differ from category default', () => {
    // aws:Lambda is micro (1×1×1) but 'function' category default is also micro.
    // aws:CloudFront is 4×1×1 — 'gateway' default is wide (3×1×1).
    const cfDims = getBlockDimensions('delivery', 'aws', 'cloudfront');
    const defaultDims = getBlockDimensions('delivery');
    expect(cfDims).toEqual({ width: 4, depth: 1, height: 1 });
    expect(defaultDims).toEqual({ width: 3, depth: 1, height: 1 });
    expect(cfDims).not.toEqual(defaultDims);
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
