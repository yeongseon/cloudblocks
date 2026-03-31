import { describe, expect, it } from 'vitest';
import type { ResourceBlock } from '@cloudblocks/schema';
import { getEffectiveEndpointType, resolveEndpointSource } from '../endpointResolver';

function makeBlock(overrides: Partial<ResourceBlock> = {}): ResourceBlock {
  return {
    id: 'block-1',
    name: 'Block',
    kind: 'resource',
    layer: 'resource',
    resourceType: 'web_compute',
    category: 'compute',
    provider: 'azure',
    parentId: 'container-1',
    position: { x: 1, y: 0, z: 2 },
    metadata: {},
    ...overrides,
  };
}

describe('endpointResolver', () => {
  it('resolves resource blocks into normalized endpoint sources', () => {
    const block = makeBlock();
    const source = resolveEndpointSource(block.id, [block]);

    expect(source).toEqual({
      id: block.id,
      category: 'compute',
      resourceType: 'web_compute',
      position: block.position,
      parentId: block.parentId,
      isExternal: false,
    });
  });

  it('maps external resource types to internet/browser endpoint types', () => {
    expect(
      getEffectiveEndpointType(
        makeBlock({ resourceType: 'internet', category: 'delivery', parentId: null }),
      ),
    ).toBe('internet');
    expect(
      getEffectiveEndpointType(
        makeBlock({ resourceType: 'browser', category: 'delivery', parentId: null }),
      ),
    ).toBe('browser');
  });

  it('returns category endpoint type for non-external blocks', () => {
    expect(
      getEffectiveEndpointType(
        makeBlock({ category: 'data', resourceType: 'relational_database' }),
      ),
    ).toBe('data');
  });
});

it('prefers node over actor when IDs collide (post-bridge: node is source of truth)', () => {
  const block = makeBlock({
    id: 'ext-internet-1',
    resourceType: 'internet',
    category: 'delivery',
    parentId: null,
    position: { x: -3, y: 0, z: 5 },
    roles: ['external'],
  });

  const source = resolveEndpointSource('ext-internet-1', [block]);

  expect(source).not.toBeNull();
  expect(source!.position).toEqual({ x: -3, y: 0, z: 5 });
  expect(source!.isExternal).toBe(true);
  expect(source!.category).toBe('delivery');
});

it('falls back to nodes when no matching actor exists', () => {
  const block = makeBlock({ id: 'regular-block', parentId: 'container-1' });
  const source = resolveEndpointSource('regular-block', [block]);

  expect(source).not.toBeNull();
  expect(source!.id).toBe('regular-block');
  expect(source!.isExternal).toBe(false);
});

it('returns null when ID matches neither nodes nor actors', () => {
  expect(resolveEndpointSource('nonexistent', [])).toBeNull();
});
