import { describe, expect, it } from 'vitest';
import { KNOWN_RESOURCE_TYPES } from '@cloudblocks/schema';
import { validateBlockPlacement, VALID_PARENTS } from '@cloudblocks/domain';
import { validateArchitecture } from '../../web/src/entities/validation/engine';
import { validateArchitectureShape } from '../../web/src/entities/store/slices/persistenceSlice';
import {
  validateGridAlignment,
  validateNoOverlap,
} from '../../web/src/entities/validation/placement';
import { spikeFixture } from './fixture';

describe('visual comparison fixture', () => {
  it('uses only known types and valid parents at every level', () => {
    const nodes = spikeFixture.nodes;
    for (const node of nodes) {
      expect(KNOWN_RESOURCE_TYPES.has(node.resourceType), node.id).toBe(true);
      expect(validateBlockPlacement(node, nodes), node.id).toEqual([]);
      if (node.parentId) {
        const parent = nodes.find((candidate) => candidate.id === node.parentId);
        expect(parent?.kind, node.id).toBe('container');
        if (!parent) throw new Error(`Missing parent for ${node.id}`);
        expect(VALID_PARENTS[node.layer].includes(parent.layer), node.id).toBe(true);
      }
    }
    expect(nodes.find((node) => node.id === 'front-door')?.parentId).toBeNull();
    expect(
      nodes
        .filter((node) =>
          ['app_service', 'function_compute', 'sql_database', 'key_vault'].includes(
            node.resourceType,
          ),
        )
        .every((node) => node.parentId === null),
    ).toBe(true);
    expect(nodes.find((node) => node.id === 'internet')).toMatchObject({
      kind: 'resource',
      resourceType: 'internet',
      parentId: null,
      roles: ['external'],
    });
    expect(nodes.filter((node) => node.kind === 'container')).toHaveLength(3);
  });

  it('passes production validation for resources and connections', () => {
    expect(validateArchitecture(spikeFixture).errors).toEqual([]);
    expect(spikeFixture.connections[0].id).toBe('internet-front');
    const resources = spikeFixture.nodes.filter((node) => node.kind === 'resource');
    for (const resource of resources) {
      expect(validateGridAlignment(resource), resource.id).toBeNull();
      expect(
        validateNoOverlap(
          resource,
          resources.filter((sibling) => sibling.parentId === resource.parentId),
          () => ({ width: 2, height: 2, depth: 2 }),
        ),
        resource.id,
      ).toBeNull();
    }
  });

  it('is accepted by the production import-shape check', () => {
    expect(validateArchitectureShape(spikeFixture)).toEqual({ valid: true });
  });
});
