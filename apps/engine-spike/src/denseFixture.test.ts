import { describe, expect, it } from 'vitest';
import type { ResourceBlock } from '@cloudblocks/schema';
import { KNOWN_RESOURCE_TYPES } from '@cloudblocks/schema';
import { VALID_PARENTS, validateBlockPlacement } from '@cloudblocks/domain';
import { validateArchitecture } from '../../web/src/entities/validation/engine';
import { validateArchitectureShape } from '../../web/src/entities/store/slices/persistenceSlice';
import {
  validateGridAlignment,
  validateNoOverlap,
} from '../../web/src/entities/validation/placement';
import { denseFixture } from './denseFixture';
import { spikeFixture } from './fixture';

describe('separate dense comparison fixture', () => {
  it('adds pressure without changing the original architecture', () => {
    expect(denseFixture.nodes.length).toBeGreaterThan(spikeFixture.nodes.length);
    expect(denseFixture.connections.length).toBeGreaterThan(spikeFixture.connections.length * 2);
    expect(spikeFixture.nodes).toHaveLength(10);
    expect(spikeFixture.connections).toHaveLength(6);
    expect(
      denseFixture.nodes
        .filter((node) =>
          ['app_service', 'function_compute', 'sql_database', 'key_vault', 'cache_store'].includes(
            node.resourceType,
          ),
        )
        .every((node) => node.parentId === null),
    ).toBe(true);
  });

  it('obeys containment, grid alignment, sibling separation, and all connection rules', () => {
    const nodes = denseFixture.nodes;
    for (const node of nodes) {
      expect(KNOWN_RESOURCE_TYPES.has(node.resourceType), node.id).toBe(true);
      expect(validateBlockPlacement(node, nodes), node.id).toEqual([]);
      if (node.parentId) {
        const parent = nodes.find((candidate) => candidate.id === node.parentId);
        if (!parent) throw new Error(`Missing parent for ${node.id}`);
        expect(parent.kind, node.id).toBe('container');
        expect(VALID_PARENTS[node.layer].includes(parent.layer), node.id).toBe(true);
      }
      if (node.kind === 'resource') {
        expect(validateGridAlignment(node), node.id).toBeNull();
        const siblings = nodes.filter(
          (candidate): candidate is ResourceBlock =>
            candidate.kind === 'resource' && candidate.parentId === node.parentId,
        );
        expect(
          validateNoOverlap(node, siblings, () => ({ width: 2, height: 2, depth: 2 })),
          node.id,
        ).toBeNull();
      }
    }
    expect(validateArchitectureShape(denseFixture)).toEqual({ valid: true });
    expect(validateArchitecture(denseFixture).errors).toEqual([]);
  });
});
