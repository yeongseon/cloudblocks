// @cloudblocks/domain — Containment constraint tests
// Locks the fail-closed behaviour introduced by #1965.

import { describe, it, expect } from 'vitest';
import type { Block } from '@cloudblocks/schema';
import { validateBlockIntegrity, validateContainment } from '../constraints.js';

function resource(overrides: Partial<Block> = {}): Block {
  return {
    id: 'block-1',
    name: 'Block',
    kind: 'resource',
    layer: 'resource',
    resourceType: 'virtual_machine',
    category: 'compute',
    provider: 'azure',
    parentId: 'container-1',
    position: { x: 0, y: 0, z: 0 },
    metadata: {},
    ...overrides,
  } as Block;
}

function container(overrides: Partial<Block> = {}): Block {
  return {
    id: 'container-1',
    name: 'Subnet',
    kind: 'container',
    layer: 'subnet',
    resourceType: 'subnet',
    category: 'network',
    provider: 'azure',
    parentId: null,
    position: { x: 0, y: 0, z: 0 },
    frame: { width: 8, height: 1, depth: 8 },
    metadata: {},
    ...overrides,
  } as Block;
}

describe('validateContainment', () => {
  it('accepts a resource inside an allowed parent', () => {
    expect(validateContainment(resource(), container())).toBeNull();
  });

  it('rejects a subnet-only resource inside a virtual network', () => {
    const error = validateContainment(
      resource(),
      container({ id: 'vnet-1', layer: 'region', resourceType: 'virtual_network' }),
    );

    expect(error?.childResourceType).toBe('virtual_machine');
    expect(error?.parentResourceType).toBe('virtual_network');
  });

  it('rejects an unknown resource type instead of skipping validation', () => {
    const error = validateContainment(resource({ resourceType: 'not-a-real-type' }), container());

    expect(error).not.toBeNull();
    expect(error?.reason).toContain('not a known resource type');
  });

  it('rejects an unknown resource type at root level', () => {
    const error = validateContainment(
      resource({ resourceType: 'not-a-real-type', parentId: null }),
      null,
    );

    expect(error?.parentId).toBeNull();
    expect(error?.reason).toContain('not a known resource type');
  });

  it('rejects prototype member names that a bare object lookup would resolve', () => {
    for (const name of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      const error = validateContainment(resource({ resourceType: name }), container());

      expect(error, `"${name}" was treated as a known resource type`).not.toBeNull();
      expect(error?.reason).toContain('not a known resource type');
    }
  });
});

describe('validateBlockIntegrity', () => {
  it('accepts a container-capable type declared as a container', () => {
    expect(validateBlockIntegrity(container())).toEqual([]);
  });

  it('rejects a leaf-only type declared as a container', () => {
    const errors = validateBlockIntegrity(resource({ kind: 'container' }));

    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('kind');
  });

  it('rejects an unknown resource type instead of passing silently', () => {
    const errors = validateBlockIntegrity(resource({ resourceType: 'not-a-real-type' }));

    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('resourceType');
  });

  it('rejects prototype member names that a bare object lookup would resolve', () => {
    for (const name of ['constructor', 'toString', '__proto__']) {
      const errors = validateBlockIntegrity(resource({ resourceType: name }));

      expect(errors, `"${name}" was treated as a known resource type`).toHaveLength(1);
      expect(errors[0].field).toBe('resourceType');
    }
  });
});
