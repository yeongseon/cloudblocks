import { describe, expect, it } from 'vitest';
import type { ArchitectureModel, Block, ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import { endpointId, generateEndpointsForBlock } from '@cloudblocks/schema';
import { validateGraphInvariants } from './graph';
import { validateArchitecture } from './engine';

function container(overrides: Partial<ContainerBlock> = {}): ContainerBlock {
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
  };
}

function resource(overrides: Partial<ResourceBlock> = {}): ResourceBlock {
  return {
    id: 'block-1',
    name: 'VM',
    kind: 'resource',
    layer: 'resource',
    resourceType: 'virtual_machine',
    category: 'compute',
    provider: 'azure',
    parentId: 'container-1',
    position: { x: 0, y: 0, z: 0 },
    metadata: {},
    ...overrides,
  };
}

function model(nodes: Block[], overrides: Partial<ArchitectureModel> = {}): ArchitectureModel {
  return {
    id: 'arch-1',
    name: 'Architecture',
    version: '1',
    nodes,
    endpoints: nodes.flatMap((node) => generateEndpointsForBlock(node.id)),
    connections: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function ruleIds(architecture: ArchitectureModel): string[] {
  return validateGraphInvariants(architecture).map((issue) => issue.ruleId);
}

describe('validateGraphInvariants', () => {
  it('accepts a well-formed architecture', () => {
    expect(validateGraphInvariants(model([container(), resource()]))).toEqual([]);
  });

  it('rejects duplicate node ids that would collapse in the store index', () => {
    const architecture = model([container(), resource(), resource({ name: 'VM copy' })]);

    expect(ruleIds(architecture)).toContain('rule-graph-duplicate-node-id');
  });

  it('rejects duplicate endpoint ids', () => {
    const architecture = model([container(), resource()]);
    architecture.endpoints = [...architecture.endpoints, architecture.endpoints[0]];

    expect(ruleIds(architecture)).toContain('rule-graph-duplicate-endpoint-id');
  });

  it('rejects duplicate connection ids', () => {
    const connection = {
      id: 'conn-1',
      from: endpointId('block-1', 'output', 'data'),
      to: endpointId('block-2', 'input', 'data'),
      metadata: {},
    };
    const architecture = model([container(), resource(), resource({ id: 'block-2' })], {
      connections: [connection, { ...connection }],
    });

    expect(ruleIds(architecture)).toContain('rule-graph-duplicate-connection-id');
  });

  it('rejects a self-parenting block', () => {
    const architecture = model([container({ id: 'container-1', parentId: 'container-1' })]);

    expect(ruleIds(architecture)).toContain('rule-graph-self-parent');
  });

  it('rejects an A to B to A containment cycle', () => {
    const architecture = model([
      container({ id: 'container-a', parentId: 'container-b' }),
      container({ id: 'container-b', parentId: 'container-a' }),
    ]);

    expect(ruleIds(architecture)).toContain('rule-graph-parent-cycle');
  });

  it('rejects a three-node containment cycle', () => {
    const architecture = model([
      container({ id: 'container-a', parentId: 'container-c' }),
      container({ id: 'container-b', parentId: 'container-a' }),
      container({ id: 'container-c', parentId: 'container-b' }),
    ]);

    expect(ruleIds(architecture)).toContain('rule-graph-parent-cycle');
  });

  it('rejects a parent that does not exist', () => {
    const architecture = model([resource({ parentId: 'container-missing' })]);

    expect(ruleIds(architecture)).toContain('rule-graph-missing-parent');
  });

  it('rejects a parent that is not a container', () => {
    const architecture = model([
      resource({ id: 'block-parent', parentId: null, resourceType: 'blob_storage' }),
      resource({ id: 'block-child', parentId: 'block-parent' }),
    ]);

    expect(ruleIds(architecture)).toContain('rule-graph-parent-not-container');
  });

  it.each([
    ['zero width', { width: 0, height: 1, depth: 8 }],
    ['negative depth', { width: 8, height: 1, depth: -8 }],
    ['non-finite height', { width: 8, height: Number.NaN, depth: 8 }],
  ])('rejects a container frame with %s', (_label, frame) => {
    const architecture = model([container({ frame })]);

    expect(ruleIds(architecture)).toContain('rule-graph-container-frame');
  });

  it('rejects a non-finite position', () => {
    const architecture = model([
      container(),
      resource({ position: { x: Number.POSITIVE_INFINITY, y: 0, z: 0 } }),
    ]);

    expect(ruleIds(architecture)).toContain('rule-graph-position');
  });

  it('rejects an endpoint whose owning block is gone', () => {
    const architecture = model([container(), resource()]);
    architecture.endpoints = [
      ...architecture.endpoints,
      ...generateEndpointsForBlock('block-deleted'),
    ];

    expect(ruleIds(architecture)).toContain('rule-graph-endpoint-owner');
  });

  it('rejects an endpoint id that disagrees with its own block and port', () => {
    const architecture = model([container(), resource()]);
    architecture.endpoints = [
      ...architecture.endpoints,
      {
        id: 'endpoint-block-1-output-http',
        blockId: 'block-1',
        direction: 'input',
        semantic: 'data',
      },
    ];

    expect(ruleIds(architecture)).toContain('rule-graph-endpoint-id');
  });

  it('rejects a leaf-only resource type declared as a container', () => {
    const architecture = model([
      container(),
      { ...resource(), kind: 'container', frame: { width: 2, height: 1, depth: 2 } } as Block,
    ]);

    expect(ruleIds(architecture)).toContain('rule-graph-block-integrity');
  });

  it('rejects an architecture that exceeds a block outbound port budget', () => {
    // A data block has 1 outbound port; two outgoing connections overflow it.
    const architecture = model(
      [
        container(),
        resource({ id: 'source', resourceType: 'sql_database', category: 'data' }),
        resource({ id: 'target-a' }),
        resource({ id: 'target-b' }),
      ],
      {
        connections: [
          {
            id: 'conn-a',
            from: endpointId('source', 'output', 'data'),
            to: endpointId('target-a', 'input', 'data'),
            metadata: {},
          },
          {
            id: 'conn-b',
            from: endpointId('source', 'output', 'data'),
            to: endpointId('target-b', 'input', 'data'),
            metadata: {},
          },
        ],
      },
    );

    expect(ruleIds(architecture)).toContain('rule-graph-port-capacity');
  });

  it('rejects an architecture that exceeds a block inbound port budget', () => {
    const architecture = model(
      [
        container(),
        resource({ id: 'target', resourceType: 'network_security_group', category: 'security' }),
        resource({ id: 'source-a' }),
        resource({ id: 'source-b' }),
      ],
      {
        connections: [
          {
            id: 'conn-a',
            from: endpointId('source-a', 'output', 'data'),
            to: endpointId('target', 'input', 'data'),
            metadata: {},
          },
          {
            id: 'conn-b',
            from: endpointId('source-b', 'output', 'data'),
            to: endpointId('target', 'input', 'data'),
            metadata: {},
          },
        ],
      },
    );

    expect(ruleIds(architecture)).toContain('rule-graph-port-capacity');
  });
});

describe('validateArchitecture runs graph invariants', () => {
  it('reports duplicate ids that would silently collapse in the store index', () => {
    const architecture = model([container(), resource(), resource({ name: 'VM copy' })]);

    const result = validateArchitecture(architecture);
    const nodeIds = new Set(architecture.nodes.map((node) => node.id));

    expect(nodeIds.size).toBeLessThan(architecture.nodes.length);
    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.ruleId)).toContain('rule-graph-duplicate-node-id');
  });

  it('keeps a valid architecture valid', () => {
    expect(validateArchitecture(model([container(), resource()])).valid).toBe(true);
  });
});
