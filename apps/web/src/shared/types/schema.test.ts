import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContainerBlock, ResourceBlock, Workspace } from './index';
import {
  SCHEMA_VERSION,
  createBlankArchitecture,
  deserialize,
  migrateExternalActorsToBlocks,
  serialize,
} from './schema';

function createWorkspace(id: string): Workspace {
  return {
    id,
    name: `Workspace ${id}`,
    provider: 'azure' as const,
    architecture: {
      id: `arch-${id}`,
      name: `Architecture ${id}`,
      version: '1',
      nodes: [
        {
          id: 'ext-browser',
          name: 'Client',
          kind: 'resource',
          layer: 'resource',
          resourceType: 'browser',
          category: 'delivery',
          provider: 'azure',
          parentId: null,
          roles: ['external'],
          position: { x: -6, y: 0, z: 5 },
          metadata: {},
        },
        {
          id: 'ext-internet',
          name: 'Internet',
          kind: 'resource',
          layer: 'resource',
          resourceType: 'internet',
          category: 'delivery',
          provider: 'azure',
          parentId: null,
          roles: ['external'],
          position: { x: -3, y: 0, z: 5 },
          metadata: {},
        },
      ],
      connections: [],
      endpoints: [],
      externalActors: [
        { id: 'ext-internet', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('schema utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('serialize produces valid json with schemaVersion', () => {
    const workspaces = [createWorkspace('w1')];

    const json = serialize(workspaces);
    const parsed = JSON.parse(json) as { schemaVersion: string; workspaces: Workspace[] };

    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    // serialize materializes externalActors into nodes and strips the legacy field
    expect(parsed.workspaces[0].architecture.externalActors).toBeUndefined();
    const nodes = parsed.workspaces[0].architecture.nodes;
    expect(nodes).toHaveLength(2);
    const internetNode = nodes.find((node) => node.id === 'ext-internet');
    const browserNode = nodes.find((node) => node.id === 'ext-browser');
    expect(browserNode).toBeDefined();
    expect(internetNode).toBeDefined();
    expect(internetNode?.kind).toBe('resource');
    expect(internetNode?.resourceType).toBe('internet');
    expect(internetNode?.category).toBe('delivery');
    expect(internetNode?.parentId).toBeNull();
    expect(internetNode?.roles).toEqual(['external']);
    expect(parsed.workspaces[0].architecture.endpoints).toEqual([]);
  });

  it('deserialize parses valid data', () => {
    const workspaces = [createWorkspace('w1')];
    const json = JSON.stringify({ schemaVersion: SCHEMA_VERSION, workspaces });

    const parsed = deserialize(json);

    // After deserialization, externalActors are migrated into nodes
    expect(parsed).toHaveLength(1);
    expect(parsed[0].architecture.externalActors).toEqual(
      workspaces[0].architecture.externalActors,
    );
    // Migrated external actor should now appear as a block node
    const migratedNode = parsed[0].architecture.nodes.find((n) => n.id === 'ext-internet');
    expect(migratedNode).toBeDefined();
    expect(migratedNode?.kind).toBe('resource');
    expect(migratedNode?.resourceType).toBe('internet');
    expect(migratedNode?.category).toBe('delivery');
    expect(migratedNode?.roles).toEqual(['external']);
    expect(migratedNode?.parentId).toBeNull();
  });

  it('migrates legacy plates without profileId', () => {
    const legacyData = {
      schemaVersion: SCHEMA_VERSION,
      workspaces: [
        {
          id: 'ws-1',
          name: 'Test',
          architecture: {
            id: 'arch-1',
            name: 'Test',
            version: '1',
            plates: [
              {
                id: 'container-1',
                name: 'VNet',
                type: 'region',
                parentId: null,
                children: [],
                position: { x: 0, y: 0, z: 0 },
                size: { width: 16, height: 0.3, depth: 20 },
                metadata: {},
              },
            ],
            blocks: [],
            connections: [],
            endpoints: [],
            externalActors: [
              {
                id: 'ext-internet',
                name: 'Internet',
                type: 'internet',
                position: { x: -3, y: 0, z: 5 },
              },
            ],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const result = deserialize(JSON.stringify(legacyData));
    const container = result[0].architecture.nodes.find(
      (node): node is ContainerBlock => node.kind === 'container',
    );

    expect(container).toBeDefined();
    if (!container) {
      throw new Error('Expected migrated container node');
    }
    expect(container.profileId).toBe('network-platform');
    expect(container.frame.height).toBe(0.7);
    expect(container.frame.width).toBe(16);
    expect(container.frame.depth).toBe(20);
  });

  it('preserves existing profileId on plates', () => {
    const data = {
      schemaVersion: SCHEMA_VERSION,
      workspaces: [
        {
          id: 'ws-1',
          name: 'Test',
          architecture: {
            id: 'arch-1',
            name: 'Test',
            version: '1',
            plates: [
              {
                id: 'container-1',
                name: 'VNet',
                type: 'region',
                profileId: 'network-hub',
                parentId: null,
                children: [],
                position: { x: 0, y: 0, z: 0 },
                size: { width: 20, height: 0.7, depth: 24 },
                metadata: {},
              },
            ],
            blocks: [],
            connections: [],
            endpoints: [],
            externalActors: [
              {
                id: 'ext-internet',
                name: 'Internet',
                type: 'internet',
                position: { x: -3, y: 0, z: 5 },
              },
            ],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const result = deserialize(JSON.stringify(data));
    const container = result[0].architecture.nodes.find(
      (node): node is ContainerBlock => node.kind === 'container',
    );

    expect(container).toBeDefined();
    if (!container) {
      throw new Error('Expected migrated container node');
    }
    expect(container.profileId).toBe('network-hub');
    expect(container.frame.width).toBe(20);
    expect(container.frame.depth).toBe(24);
    expect(container.frame.height).toBe(0.7);
  });

  it('rebuilds frame when container has profileId but no frame or size', () => {
    const data = {
      schemaVersion: SCHEMA_VERSION,
      workspaces: [
        {
          id: 'ws-1',
          name: 'Test',
          architecture: {
            id: 'arch-1',
            name: 'Test',
            version: '1',
            nodes: [
              {
                id: 'container-1',
                kind: 'container',
                name: 'VNet',
                layer: 'region',
                profileId: 'network-platform',
                parentId: null,
                children: [],
                position: { x: 0, y: 0, z: 0 },
                metadata: {},
              },
            ],
            connections: [],
            endpoints: [],
            externalActors: [
              {
                id: 'ext-internet',
                name: 'Internet',
                type: 'internet',
                position: { x: -3, y: 0, z: 5 },
              },
            ],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const result = deserialize(JSON.stringify(data));
    const container = result[0].architecture.nodes.find(
      (node): node is ContainerBlock => node.kind === 'container',
    );

    expect(container).toBeDefined();
    if (!container) {
      throw new Error('Expected container node');
    }
    expect(container.profileId).toBe('network-platform');
    expect(container.frame).toBeDefined();
    expect(container.frame.width).toBe(16);
    expect(container.frame.height).toBe(0.7);
    expect(container.frame.depth).toBe(20);
  });

  it('rebuilds frame when container has profileId and legacy size key', () => {
    const data = {
      schemaVersion: SCHEMA_VERSION,
      workspaces: [
        {
          id: 'ws-1',
          name: 'Test',
          architecture: {
            id: 'arch-1',
            name: 'Test',
            version: '1',
            nodes: [
              {
                id: 'container-1',
                kind: 'container',
                name: 'VNet',
                layer: 'region',
                profileId: 'network-platform',
                parentId: null,
                children: [],
                position: { x: 0, y: 0, z: 0 },
                size: { width: 99, height: 1, depth: 99 },
                metadata: {},
              },
            ],
            connections: [],
            endpoints: [],
            externalActors: [
              {
                id: 'ext-internet',
                name: 'Internet',
                type: 'internet',
                position: { x: -3, y: 0, z: 5 },
              },
            ],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const result = deserialize(JSON.stringify(data));
    const container = result[0].architecture.nodes.find(
      (node): node is ContainerBlock => node.kind === 'container',
    );

    expect(container).toBeDefined();
    if (!container) {
      throw new Error('Expected container node');
    }
    // profileId preserved, frame rebuilt from profileId (not from stale size)
    expect(container.profileId).toBe('network-platform');
    expect(container.frame).toBeDefined();
    expect(container.frame.width).toBe(16);
    expect(container.frame.height).toBe(0.7);
    expect(container.frame.depth).toBe(20);
  });

  it('migrates legacy external actors without position', () => {
    const legacyData = {
      schemaVersion: SCHEMA_VERSION,
      workspaces: [
        {
          id: 'ws-1',
          name: 'Test',
          architecture: {
            id: 'arch-1',
            name: 'Test',
            version: '1',
            plates: [],
            blocks: [],
            connections: [],
            endpoints: [],
            externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' }],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const result = deserialize(JSON.stringify(legacyData));

    expect(result[0].architecture.externalActors?.[0]?.position).toEqual({ x: 7, y: 0, z: 10 });
  });

  it('rejects legacy 0.1.0 schema (clean start — no migration)', () => {
    const oldData = {
      schemaVersion: '0.1.0',
      workspaces: [
        {
          id: 'ws-1',
          name: 'Test',
          architecture: {
            id: 'arch-1',
            name: 'Test',
            version: '1',
            plates: [],
            blocks: [
              {
                id: 'blk-1',
                name: 'Web Server',
                category: 'compute',
                placementId: 'container-1',
                position: { x: 1, y: 0.5, z: 1 },
                metadata: {},
                provider: 'aws',
              },
            ],
            connections: [],
            endpoints: [],
            externalActors: [
              {
                id: 'ext-internet',
                name: 'Internet',
                type: 'internet',
                position: { x: -3, y: 0, z: 5 },
              },
            ],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    expect(() => deserialize(JSON.stringify(oldData))).toThrow(
      'Incompatible workspace format: v0.1.0 is no longer supported.',
    );
  });

  it('rejects legacy 0.2.0 schema (clean start — no migration)', () => {
    const oldData = {
      schemaVersion: '0.2.0',
      workspaces: [
        {
          id: 'ws-1',
          name: 'Test',
          architecture: {
            id: 'arch-1',
            name: 'Test',
            version: '1',
            plates: [],
            blocks: [],
            connections: [],
            endpoints: [],
            externalActors: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    expect(() => deserialize(JSON.stringify(oldData))).toThrow(
      'Incompatible workspace format: v0.2.0 is no longer supported.',
    );
  });

  it('roundtrips blocks with subtype and config via serialize/deserialize', () => {
    const container: ContainerBlock = {
      id: 'container-1',
      name: 'Subnet',
      kind: 'container',
      layer: 'subnet',
      resourceType: 'subnet',
      category: 'network',
      provider: 'azure',
      parentId: null,
      position: { x: 0, y: 0, z: 0 },
      frame: { width: 6, height: 0.5, depth: 8 },
      metadata: {},
      profileId: 'subnet-service',
    };
    const leaf: ResourceBlock = {
      id: 'blk-1',
      name: 'Lambda',
      kind: 'resource',
      layer: 'resource',
      resourceType: 'web_compute',
      category: 'compute',
      provider: 'aws',
      parentId: 'container-1',
      position: { x: 1, y: 0.5, z: 1 },
      metadata: {},
      subtype: 'lambda',
      config: { runtime: 'nodejs20.x', memorySize: 512 },
    };

    const workspaces: Workspace[] = [
      {
        id: 'ws-1',
        name: 'Test',
        provider: 'azure' as const,
        architecture: {
          id: 'arch-1',
          name: 'Test',
          version: '1',
          nodes: [container, leaf],
          connections: [],
          endpoints: [],
          externalActors: [
            {
              id: 'ext-internet',
              name: 'Internet',
              type: 'internet',
              position: { x: -3, y: 0, z: 5 },
            },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const json = serialize(workspaces);
    const parsed = deserialize(json);
    const block = parsed[0].architecture.nodes.find(
      (node): node is ResourceBlock => node.kind === 'resource',
    );

    expect(block).toBeDefined();
    if (!block) {
      throw new Error('Expected roundtripped resource node');
    }
    expect(block.subtype).toBe('lambda');
    expect(block.config).toEqual({ runtime: 'nodejs20.x', memorySize: 512 });
  });

  it('deserialize throws when schemaVersion is missing', () => {
    const json = JSON.stringify({ workspaces: [] });

    expect(() => deserialize(json)).toThrow(new Error('Missing schemaVersion in serialized data'));
  });

  it('deserialize warns on schema version mismatch and still returns workspaces', () => {
    const workspaces = [createWorkspace('w1')];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const json = JSON.stringify({ schemaVersion: '9.9.9', workspaces });

    const parsed = deserialize(json);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('w1');
    // Migration converts externalActors to nodes, so we don't do a deep-equal on the full structure
    expect(warnSpy).toHaveBeenCalledWith(
      `Schema version mismatch: expected ${SCHEMA_VERSION}, got 9.9.9. Data may need migration.`,
    );
  });

  it('deserialize returns empty array when workspaces field is absent', () => {
    const json = JSON.stringify({ schemaVersion: SCHEMA_VERSION });

    const parsed = deserialize(json);

    expect(parsed).toEqual([]);
  });

  it('deserialize tolerates legacy workspace payloads without architecture', () => {
    const legacyJson = JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      workspaces: [
        {
          id: 'ws-legacy',
          name: 'Legacy Workspace',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    const parsed = deserialize(legacyJson);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('ws-legacy');
  });

  it('createBlankArchitecture returns the expected default structure', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-03T04:05:06.000Z'));

    const architecture = createBlankArchitecture('arch-1', 'My Architecture');

    expect(architecture).toEqual({
      id: 'arch-1',
      name: 'My Architecture',
      version: '1',
      nodes: [
        {
          id: 'ext-browser',
          name: 'Client',
          kind: 'resource',
          layer: 'resource',
          resourceType: 'browser',
          category: 'delivery',
          provider: 'azure',
          parentId: null,
          roles: ['external'],
          position: { x: 1, y: 0, z: 10 },
          metadata: {},
        },
        {
          id: 'ext-internet',
          name: 'Internet',
          kind: 'resource',
          layer: 'resource',
          resourceType: 'internet',
          category: 'delivery',
          provider: 'azure',
          parentId: null,
          roles: ['external'],
          position: { x: 7, y: 0, z: 10 },
          metadata: {},
        },
      ],
      connections: [
        {
          id: 'conn-browser-internet',
          from: 'endpoint-ext-browser-output-http',
          to: 'endpoint-ext-internet-input-http',
          metadata: {},
        },
      ],
      endpoints: [
        {
          id: 'endpoint-ext-browser-input-http',
          blockId: 'ext-browser',
          direction: 'input',
          semantic: 'http',
        },
        {
          id: 'endpoint-ext-browser-input-event',
          blockId: 'ext-browser',
          direction: 'input',
          semantic: 'event',
        },
        {
          id: 'endpoint-ext-browser-input-data',
          blockId: 'ext-browser',
          direction: 'input',
          semantic: 'data',
        },
        {
          id: 'endpoint-ext-browser-output-http',
          blockId: 'ext-browser',
          direction: 'output',
          semantic: 'http',
        },
        {
          id: 'endpoint-ext-browser-output-event',
          blockId: 'ext-browser',
          direction: 'output',
          semantic: 'event',
        },
        {
          id: 'endpoint-ext-browser-output-data',
          blockId: 'ext-browser',
          direction: 'output',
          semantic: 'data',
        },
        {
          id: 'endpoint-ext-internet-input-http',
          blockId: 'ext-internet',
          direction: 'input',
          semantic: 'http',
        },
        {
          id: 'endpoint-ext-internet-input-event',
          blockId: 'ext-internet',
          direction: 'input',
          semantic: 'event',
        },
        {
          id: 'endpoint-ext-internet-input-data',
          blockId: 'ext-internet',
          direction: 'input',
          semantic: 'data',
        },
        {
          id: 'endpoint-ext-internet-output-http',
          blockId: 'ext-internet',
          direction: 'output',
          semantic: 'http',
        },
        {
          id: 'endpoint-ext-internet-output-event',
          blockId: 'ext-internet',
          direction: 'output',
          semantic: 'event',
        },
        {
          id: 'endpoint-ext-internet-output-data',
          blockId: 'ext-internet',
          direction: 'output',
          semantic: 'data',
        },
      ],
      externalActors: [
        { id: 'ext-browser', name: 'Client', type: 'browser', position: { x: 1, y: 0, z: 10 } },
        {
          id: 'ext-internet',
          name: 'Internet',
          type: 'internet',
          position: { x: 7, y: 0, z: 10 },
        },
      ],
      createdAt: '2026-02-03T04:05:06.000Z',
      updatedAt: '2026-02-03T04:05:06.000Z',
    });
  });
});

it('roundtrips with serialize and deserialize', () => {
  const workspaces = [createWorkspace('w1'), createWorkspace('w2')];

  const json = serialize(workspaces);
  const parsed = deserialize(json);

  // serialize() materializes externalActors into nodes.
  // After roundtrip, each workspace should have ext-internet as a node.
  expect(parsed).toHaveLength(2);
  for (const ws of parsed) {
    expect(ws.architecture.externalActors).toBeUndefined();
    const internetNode = ws.architecture.nodes.find((n) => n.id === 'ext-internet');
    expect(internetNode).toBeDefined();
    expect(internetNode?.kind).toBe('resource');
    expect(internetNode?.resourceType).toBe('internet');
    expect(internetNode?.roles).toEqual(['external']);
    // Endpoints should be present for the materialized block
    const internetEndpoints = ws.architecture.endpoints.filter((ep) =>
      ep.id.includes('ext-internet'),
    );
    expect(internetEndpoints).toHaveLength(6);
  }
});

it('roundtrips createBlankArchitecture through serialize and deserialize', () => {
  const blankWs: Workspace = {
    id: 'ws-blank',
    name: 'Blank',
    provider: 'azure',
    architecture: createBlankArchitecture('arch-blank', 'Blank Arch'),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const json = serialize([blankWs]);
  const [loaded] = deserialize(json);

  // ext-browser and ext-internet must survive the roundtrip as block nodes
  const browserNode = loaded.architecture.nodes.find((n) => n.id === 'ext-browser');
  const internetNode = loaded.architecture.nodes.find((n) => n.id === 'ext-internet');
  expect(browserNode).toBeDefined();
  expect(internetNode).toBeDefined();
  expect(browserNode?.resourceType).toBe('browser');
  expect(internetNode?.resourceType).toBe('internet');
  expect(browserNode?.roles).toEqual(['external']);
  expect(internetNode?.roles).toEqual(['external']);
  expect(browserNode?.position).toEqual({ x: 1, y: 0, z: 10 });
  expect(internetNode?.position).toEqual({ x: 7, y: 0, z: 10 });
  expect(browserNode?.position).not.toEqual(internetNode?.position);

  // Endpoints should include both blocks (6 each = 12 total)
  const browserEps = loaded.architecture.endpoints.filter((ep) => ep.id.includes('ext-browser'));
  const internetEps = loaded.architecture.endpoints.filter((ep) => ep.id.includes('ext-internet'));
  expect(browserEps).toHaveLength(6);
  expect(internetEps).toHaveLength(6);

  // Connection should still resolve
  expect(loaded.architecture.connections).toHaveLength(1);
  expect(loaded.architecture.connections[0].from).toContain('ext-browser');
  expect(loaded.architecture.connections[0].to).toContain('ext-internet');
});

it('roundtrip keeps browser and internet at distinct default positions', () => {
  const workspace: Workspace = {
    id: 'ws-distinct',
    name: 'Distinct External Positions',
    provider: 'azure',
    architecture: createBlankArchitecture('arch-distinct', 'Distinct External Positions'),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const [loaded] = deserialize(serialize([workspace]));
  const browserNode = loaded.architecture.nodes.find((n) => n.id === 'ext-browser');
  const internetNode = loaded.architecture.nodes.find((n) => n.id === 'ext-internet');

  expect(browserNode?.position).toEqual({ x: 1, y: 0, z: 10 });
  expect(internetNode?.position).toEqual({ x: 7, y: 0, z: 10 });
  expect(browserNode?.position).not.toEqual(internetNode?.position);
});

it('remaps legacy 10-category names to 7-category names during plates+blocks migration', () => {
  const legacyData = {
    schemaVersion: '2.0.0',
    workspaces: [
      {
        id: 'ws-1',
        name: 'Test',
        architecture: {
          id: 'arch-1',
          name: 'Test',
          version: '1',
          plates: [
            {
              id: 'container-1',
              name: 'VNet',
              type: 'region',
              parentId: null,
              children: [],
              position: { x: 0, y: 0, z: 0 },
              frame: { width: 16, height: 0.3, depth: 20 },
              metadata: {},
            },
          ],
          blocks: [
            {
              id: 'blk-db',
              name: 'Database',
              category: 'database',
              placementId: 'container-1',
              position: { x: 1, y: 0.5, z: 1 },
              metadata: {},
            },
            {
              id: 'blk-gw',
              name: 'Gateway',
              category: 'gateway',
              placementId: 'container-1',
              position: { x: 3, y: 0.5, z: 1 },
              metadata: {},
            },
            {
              id: 'blk-fn',
              name: 'Function',
              category: 'function',
              placementId: 'container-1',
              position: { x: 5, y: 0.5, z: 1 },
              metadata: {},
            },
            {
              id: 'blk-q',
              name: 'Queue',
              category: 'queue',
              placementId: 'container-1',
              position: { x: 7, y: 0.5, z: 1 },
              metadata: {},
            },
            {
              id: 'blk-ev',
              name: 'Event',
              category: 'event',
              placementId: 'container-1',
              position: { x: 9, y: 0.5, z: 1 },
              metadata: {},
            },
            {
              id: 'blk-st',
              name: 'Storage',
              category: 'storage',
              placementId: 'container-1',
              position: { x: 1, y: 0.5, z: 3 },
              metadata: {},
            },
            {
              id: 'blk-an',
              name: 'Analytics',
              category: 'analytics',
              placementId: 'container-1',
              position: { x: 3, y: 0.5, z: 3 },
              metadata: {},
            },
            {
              id: 'blk-id',
              name: 'Identity',
              category: 'identity',
              placementId: 'container-1',
              position: { x: 5, y: 0.5, z: 3 },
              metadata: {},
            },
            {
              id: 'blk-ob',
              name: 'Observability',
              category: 'observability',
              placementId: 'container-1',
              position: { x: 7, y: 0.5, z: 3 },
              metadata: {},
            },
            {
              id: 'blk-cp',
              name: 'Compute',
              category: 'compute',
              placementId: 'container-1',
              position: { x: 9, y: 0.5, z: 3 },
              metadata: {},
            },
          ],
          connections: [],
          endpoints: [],
          externalActors: [
            {
              id: 'ext-internet',
              name: 'Internet',
              type: 'internet',
              position: { x: -3, y: 0, z: 5 },
            },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  };

  const result = deserialize(JSON.stringify(legacyData));
  const nodes = result[0].architecture.nodes;

  const findNode = (id: string) => nodes.find((n) => n.id === id)!;

  // Legacy categories should be remapped to new 7-category system
  expect(findNode('blk-db').category).toBe('data');
  expect(findNode('blk-gw').category).toBe('delivery');
  expect(findNode('blk-fn').category).toBe('compute');
  expect(findNode('blk-q').category).toBe('messaging');
  expect(findNode('blk-ev').category).toBe('messaging');
  expect(findNode('blk-st').category).toBe('data');
  expect(findNode('blk-an').category).toBe('operations');
  expect(findNode('blk-id').category).toBe('identity');
  expect(findNode('blk-ob').category).toBe('operations');
  expect(findNode('blk-cp').category).toBe('compute');
});

it('remaps legacy categories on already-migrated nodes[] with old category names', () => {
  // Simulate data that was already converted to nodes[] format
  // but still has old 10-category names
  const data = {
    schemaVersion: '3.0.0',
    workspaces: [
      {
        id: 'ws-1',
        name: 'Test',
        architecture: {
          id: 'arch-1',
          name: 'Test',
          version: '1',
          nodes: [
            {
              id: 'blk-1',
              name: 'DB',
              kind: 'resource',
              layer: 'resource',
              resourceType: 'sql-database',
              category: 'database',
              provider: 'azure',
              parentId: 'container-1',
              position: { x: 1, y: 0.5, z: 1 },
              metadata: {},
            },
            {
              id: 'blk-2',
              name: 'Storage',
              kind: 'resource',
              layer: 'resource',
              resourceType: 'blob-storage',
              category: 'storage',
              provider: 'azure',
              parentId: 'container-1',
              position: { x: 3, y: 0.5, z: 1 },
              metadata: {},
            },
          ],
          connections: [],
          endpoints: [],
          externalActors: [
            {
              id: 'ext-internet',
              name: 'Internet',
              type: 'internet',
              position: { x: -3, y: 0, z: 5 },
            },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  };

  const result = deserialize(JSON.stringify(data));
  const nodes = result[0].architecture.nodes;

  expect(nodes[0].category).toBe('data');
  expect(nodes[1].category).toBe('data');
});

it('normalizes stale subtype aliases (pub-sub → pubsub) on deserialized nodes', () => {
  const data = {
    schemaVersion: '4.0.0',
    workspaces: [
      {
        id: 'ws-gcp',
        name: 'GCP Workspace',
        provider: 'gcp',
        architecture: {
          id: 'arch-gcp',
          name: 'GCP Arch',
          version: '1',
          nodes: [
            {
              id: 'blk-ps',
              name: 'Pub/Sub',
              kind: 'resource',
              layer: 'resource',
              resourceType: 'pub-sub',
              category: 'messaging',
              provider: 'gcp',
              parentId: 'container-1',
              position: { x: 1, y: 0.5, z: 1 },
              metadata: {},
              subtype: 'pub-sub',
            },
            {
              id: 'blk-ok',
              name: 'Functions',
              kind: 'resource',
              layer: 'resource',
              resourceType: 'cloud-functions',
              category: 'compute',
              provider: 'gcp',
              parentId: 'container-1',
              position: { x: 3, y: 0.5, z: 1 },
              metadata: {},
            },
          ],
          connections: [],
          endpoints: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  };

  const result = deserialize(JSON.stringify(data));
  const nodes = result[0].architecture.nodes;
  const psNode = nodes.find((n) => n.id === 'blk-ps')!;
  const okNode = nodes.find((n) => n.id === 'blk-ok')!;

  // pub-sub → pubsub on both resourceType and subtype
  expect(psNode.resourceType).toBe('pubsub');
  expect(psNode.subtype).toBe('pubsub');

  // Unrelated node untouched
  expect(okNode.resourceType).toBe('cloud-functions');
});

it('accepts schema version 2.0.0 without warning', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const data = {
    schemaVersion: '2.0.0',
    workspaces: [
      {
        id: 'ws-1',
        name: 'Test',
        architecture: {
          id: 'arch-1',
          name: 'Test',
          version: '1',
          plates: [],
          blocks: [],
          connections: [],
          endpoints: [],
          externalActors: [
            {
              id: 'ext-internet',
              name: 'Internet',
              type: 'internet',
              position: { x: -3, y: 0, z: 5 },
            },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  };

  const result = deserialize(JSON.stringify(data));
  expect(result).toHaveLength(1);
  // Should NOT emit schema mismatch warning since 2.0.0 is now supported
  expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Schema version mismatch'));
});

// ─── #1535: ExternalActor → Block Migration Tests ───────────────────────

describe('migrateExternalActorsToBlocks', () => {
  it('converts external actors to ResourceBlock nodes', () => {
    const actors = [
      {
        id: 'ext-internet',
        name: 'Internet',
        type: 'internet' as const,
        position: { x: -3, y: 0, z: 5 },
      },
      {
        id: 'ext-browser',
        name: 'Client',
        type: 'browser' as const,
        position: { x: -6, y: 0, z: 5 },
      },
    ];
    const result = migrateExternalActorsToBlocks(actors, new Set(), 'aws');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'ext-internet',
      name: 'Internet',
      kind: 'resource',
      layer: 'resource',
      resourceType: 'internet',
      category: 'delivery',
      provider: 'aws',
      parentId: null,
      position: { x: -3, y: 0, z: 5 },
      metadata: {},
      roles: ['external'],
    });
    expect(result[1].resourceType).toBe('browser');
  });

  it('is idempotent — skips actors whose ID already exists as a node', () => {
    const actors = [
      {
        id: 'ext-internet',
        name: 'Internet',
        type: 'internet' as const,
        position: { x: -3, y: 0, z: 5 },
      },
    ];
    const existingIds = new Set(['ext-internet']);
    const result = migrateExternalActorsToBlocks(actors, existingIds, 'azure');

    expect(result).toHaveLength(0);
  });

  it('uses per-type default positions when actor position is missing', () => {
    const actors = [
      {
        id: 'ext-internet',
        name: 'Internet',
        type: 'internet' as const,
        position: undefined as unknown as { x: number; y: number; z: number },
      },
      {
        id: 'ext-browser',
        name: 'Client',
        type: 'browser' as const,
        position: undefined as unknown as { x: number; y: number; z: number },
      },
    ];
    const result = migrateExternalActorsToBlocks(actors, new Set(), 'gcp');

    expect(result).toHaveLength(2);
    const internet = result.find((node) => node.id === 'ext-internet');
    const browser = result.find((node) => node.id === 'ext-browser');
    expect(internet?.position).toEqual({ x: 7, y: 0, z: 10 });
    expect(browser?.position).toEqual({ x: 1, y: 0, z: 10 });
  });
});

describe('deserialize — externalActors migration', () => {
  it('migrates externalActors into nodes while preserving them in-memory', () => {
    const data = {
      schemaVersion: SCHEMA_VERSION,
      workspaces: [
        {
          id: 'ws-1',
          name: 'Test',
          provider: 'aws',
          architecture: {
            id: 'arch-1',
            name: 'Arch',
            version: '1',
            nodes: [],
            endpoints: [],
            connections: [],
            externalActors: [
              {
                id: 'ext-browser',
                name: 'Client',
                type: 'browser',
                position: { x: -6, y: 0, z: 5 },
              },
              {
                id: 'ext-internet',
                name: 'Internet',
                type: 'internet',
                position: { x: -3, y: 0, z: 5 },
              },
            ],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const [ws] = deserialize(JSON.stringify(data));

    // Migrated blocks should appear in nodes
    expect(ws.architecture.nodes).toHaveLength(2);
    const internetNode = ws.architecture.nodes.find((n) => n.id === 'ext-internet');
    expect(internetNode).toBeDefined();
    expect(internetNode?.kind).toBe('resource');
    expect(internetNode?.resourceType).toBe('internet');
    expect(internetNode?.category).toBe('delivery');
    expect(internetNode?.provider).toBe('aws');
    expect(internetNode?.parentId).toBeNull();
    expect(internetNode?.roles).toEqual(['external']);

    const browserNode = ws.architecture.nodes.find((n) => n.id === 'ext-browser');
    expect(browserNode).toBeDefined();
    expect(browserNode?.resourceType).toBe('browser');

    // externalActors are preserved in memory for runtime backward compat
    expect(ws.architecture.externalActors).toHaveLength(2);

    // Endpoints should include the migrated block endpoints
    const internetEndpoints = ws.architecture.endpoints.filter((ep) =>
      ep.id.includes('ext-internet'),
    );
    expect(internetEndpoints).toHaveLength(6); // 3 semantics × 2 directions
  });

  it('does not duplicate nodes when externalActor ID already exists in nodes', () => {
    const data = {
      schemaVersion: SCHEMA_VERSION,
      workspaces: [
        {
          id: 'ws-1',
          name: 'Test',
          provider: 'azure',
          architecture: {
            id: 'arch-1',
            name: 'Arch',
            version: '1',
            nodes: [
              {
                id: 'ext-internet',
                name: 'Internet',
                kind: 'resource',
                layer: 'resource',
                resourceType: 'internet',
                category: 'delivery',
                provider: 'azure',
                parentId: null,
                position: { x: -3, y: 0, z: 5 },
                metadata: {},
                roles: ['external'],
              },
            ],
            endpoints: [],
            connections: [],
            externalActors: [
              {
                id: 'ext-internet',
                name: 'Internet',
                type: 'internet',
                position: { x: -3, y: 0, z: 5 },
              },
            ],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const [ws] = deserialize(JSON.stringify(data));

    // Should NOT duplicate — still just 1 node
    expect(ws.architecture.nodes).toHaveLength(1);
    expect(ws.architecture.nodes[0].id).toBe('ext-internet');
  });

  it('self-heals external blocks when browser and internet overlap', () => {
    const data = {
      schemaVersion: SCHEMA_VERSION,
      workspaces: [
        {
          id: 'ws-1',
          name: 'Test',
          provider: 'azure',
          architecture: {
            id: 'arch-1',
            name: 'Arch',
            version: '1',
            nodes: [
              {
                id: 'ext-browser',
                name: 'Client',
                kind: 'resource',
                layer: 'resource',
                resourceType: 'browser',
                category: 'delivery',
                provider: 'azure',
                parentId: null,
                position: { x: 4, y: 0, z: 10 },
                metadata: {},
                roles: ['external'],
              },
              {
                id: 'ext-internet',
                name: 'Internet',
                kind: 'resource',
                layer: 'resource',
                resourceType: 'internet',
                category: 'delivery',
                provider: 'azure',
                parentId: null,
                position: { x: 4, y: 0, z: 10 },
                metadata: {},
                roles: ['external'],
              },
            ],
            endpoints: [],
            connections: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const [ws] = deserialize(JSON.stringify(data));
    const browserNode = ws.architecture.nodes.find((n) => n.id === 'ext-browser');
    const internetNode = ws.architecture.nodes.find((n) => n.id === 'ext-internet');

    expect(browserNode?.position).toEqual({ x: 1, y: 0, z: 10 });
    expect(internetNode?.position).toEqual({ x: 7, y: 0, z: 10 });
  });

  it('does NOT self-heal when external blocks overlap at a non-default position', () => {
    // Users may intentionally place browser and internet at the same spot.
    // Self-heal should only fire at the old shared default {x:4, y:0, z:10}.
    const data = {
      schemaVersion: SCHEMA_VERSION,
      workspaces: [
        {
          id: 'ws-1',
          name: 'Test',
          provider: 'azure',
          architecture: {
            id: 'arch-1',
            name: 'Arch',
            version: '1',
            nodes: [
              {
                id: 'ext-browser',
                name: 'Client',
                kind: 'resource',
                layer: 'resource',
                resourceType: 'browser',
                category: 'delivery',
                provider: 'azure',
                parentId: null,
                position: { x: 2, y: 0, z: 8 },
                metadata: {},
                roles: ['external'],
              },
              {
                id: 'ext-internet',
                name: 'Internet',
                kind: 'resource',
                layer: 'resource',
                resourceType: 'internet',
                category: 'delivery',
                provider: 'azure',
                parentId: null,
                position: { x: 2, y: 0, z: 8 },
                metadata: {},
                roles: ['external'],
              },
            ],
            endpoints: [],
            connections: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const [ws] = deserialize(JSON.stringify(data));
    const browserNode = ws.architecture.nodes.find((n) => n.id === 'ext-browser');
    const internetNode = ws.architecture.nodes.find((n) => n.id === 'ext-internet');

    // Positions should remain unchanged — intentional overlap preserved
    expect(browserNode?.position).toEqual({ x: 2, y: 0, z: 8 });
    expect(internetNode?.position).toEqual({ x: 2, y: 0, z: 8 });
  });

  it('keeps nodes[] and externalActors[] positions in sync after self-heal roundtrip', () => {
    // After self-heal in deserialize(), externalActors[] should mirror repaired node positions.
    const data = {
      schemaVersion: SCHEMA_VERSION,
      workspaces: [
        {
          id: 'ws-1',
          name: 'Test',
          provider: 'azure',
          architecture: {
            id: 'arch-1',
            name: 'Arch',
            version: '1',
            nodes: [
              {
                id: 'ext-browser',
                name: 'Client',
                kind: 'resource',
                layer: 'resource',
                resourceType: 'browser',
                category: 'delivery',
                provider: 'azure',
                parentId: null,
                position: { x: 4, y: 0, z: 10 },
                metadata: {},
                roles: ['external'],
              },
              {
                id: 'ext-internet',
                name: 'Internet',
                kind: 'resource',
                layer: 'resource',
                resourceType: 'internet',
                category: 'delivery',
                provider: 'azure',
                parentId: null,
                position: { x: 4, y: 0, z: 10 },
                metadata: {},
                roles: ['external'],
              },
            ],
            endpoints: [],
            connections: [],
            externalActors: [
              {
                id: 'ext-browser',
                name: 'Client',
                type: 'browser',
                position: { x: 4, y: 0, z: 10 },
              },
              {
                id: 'ext-internet',
                name: 'Internet',
                type: 'internet',
                position: { x: 4, y: 0, z: 10 },
              },
            ],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const [ws] = deserialize(JSON.stringify(data));
    const browserNode = ws.architecture.nodes.find((n) => n.id === 'ext-browser');
    const internetNode = ws.architecture.nodes.find((n) => n.id === 'ext-internet');
    const browserActor = ws.architecture.externalActors?.find((a) => a.id === 'ext-browser');
    const internetActor = ws.architecture.externalActors?.find((a) => a.id === 'ext-internet');

    // nodes[] should have repaired positions
    expect(browserNode?.position).toEqual({ x: 1, y: 0, z: 10 });
    expect(internetNode?.position).toEqual({ x: 7, y: 0, z: 10 });

    // externalActors[] should mirror the repaired node positions exactly
    expect(browserActor?.position).toEqual({ x: 1, y: 0, z: 10 });
    expect(internetActor?.position).toEqual({ x: 7, y: 0, z: 10 });

    // Parity: node and actor positions must be identical
    expect(browserNode?.position).toEqual(browserActor?.position);
    expect(internetNode?.position).toEqual(internetActor?.position);
  });

  it('loads new block-only data without externalActors field', () => {
    const data = {
      schemaVersion: SCHEMA_VERSION,
      workspaces: [
        {
          id: 'ws-1',
          name: 'Test',
          provider: 'gcp',
          architecture: {
            id: 'arch-1',
            name: 'Arch',
            version: '1',
            nodes: [
              {
                id: 'ext-browser',
                name: 'Client',
                kind: 'resource',
                layer: 'resource',
                resourceType: 'browser',
                category: 'delivery',
                provider: 'gcp',
                parentId: null,
                position: { x: -6, y: 0, z: 5 },
                metadata: {},
                roles: ['external'],
              },
            ],
            endpoints: [],
            connections: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const [ws] = deserialize(JSON.stringify(data));

    // Block-only data loads without migration
    expect(ws.architecture.nodes).toHaveLength(1);
    expect(ws.architecture.nodes[0].resourceType).toBe('browser');
    expect(ws.architecture.externalActors).toBeUndefined();
  });
});

describe('serialize — strips externalActors', () => {
  it('omits externalActors from serialized output', () => {
    const workspaces: Workspace[] = [
      {
        id: 'ws-1',
        name: 'Test',
        provider: 'azure',
        architecture: {
          id: 'arch-1',
          name: 'Arch',
          version: '1',
          nodes: [],
          endpoints: [],
          connections: [],
          externalActors: [
            {
              id: 'ext-internet',
              name: 'Internet',
              type: 'internet',
              position: { x: -3, y: 0, z: 5 },
            },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const json = serialize(workspaces);
    const parsed = JSON.parse(json);

    // externalActors should not be present in the persisted JSON
    expect(parsed.workspaces[0].architecture.externalActors).toBeUndefined();
    // externalActors are materialized into nodes during serialize
    expect(parsed.workspaces[0].architecture.nodes).toHaveLength(1);
    expect(parsed.workspaces[0].architecture.nodes[0].id).toBe('ext-internet');
    expect(parsed.workspaces[0].architecture.nodes[0].resourceType).toBe('internet');
    // Endpoints are generated for the materialized node
    expect(parsed.workspaces[0].architecture.endpoints).toHaveLength(6);
    expect(parsed.workspaces[0].architecture.connections).toEqual([]);
  });

  it('preserves workspaces without externalActors unchanged', () => {
    const workspaces: Workspace[] = [
      {
        id: 'ws-1',
        name: 'Test',
        provider: 'azure',
        architecture: {
          id: 'arch-1',
          name: 'Arch',
          version: '1',
          nodes: [],
          endpoints: [],
          connections: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const json = serialize(workspaces);
    const parsed = JSON.parse(json);

    expect(parsed.workspaces[0].architecture.externalActors).toBeUndefined();
    expect(parsed.workspaces[0].id).toBe('ws-1');
  });
});

it('preserves legacy connection type into metadata.type during v3→v4 migration', () => {
  const legacyData = {
    schemaVersion: '3.0.0',
    workspaces: [
      {
        id: 'ws-1',
        name: 'Test',
        architecture: {
          id: 'arch-1',
          name: 'Test',
          version: '1',
          plates: [
            {
              id: 'container-1',
              name: 'VNet',
              type: 'region',
              parentId: null,
              children: ['block-1', 'block-2'],
              position: { x: 0, y: 0, z: 0 },
              size: { width: 16, height: 0.7, depth: 20 },
              metadata: {},
            },
          ],
          blocks: [
            {
              id: 'block-1',
              name: 'App',
              category: 'compute',
              placementId: 'container-1',
              position: { x: 1, y: 0.5, z: 1 },
              metadata: {},
            },
            {
              id: 'block-2',
              name: 'DB',
              category: 'data',
              placementId: 'container-1',
              position: { x: 3, y: 0.5, z: 3 },
              metadata: {},
            },
          ],
          connections: [
            {
              id: 'conn-http',
              sourceId: 'block-1',
              targetId: 'block-2',
              type: 'http',
            },
            {
              id: 'conn-async',
              sourceId: 'block-2',
              targetId: 'block-1',
              type: 'async',
            },
            {
              id: 'conn-data',
              sourceId: 'block-1',
              targetId: 'block-2',
              type: 'data',
            },
          ],
          endpoints: [],
          externalActors: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  };

  const result = deserialize(JSON.stringify(legacyData));
  const connections = result[0].architecture.connections;

  // Each legacy connection.type should be preserved in metadata.type
  const httpConn = connections.find((c) => c.id === 'conn-http');
  expect(httpConn?.metadata).toEqual({ type: 'http' });

  const asyncConn = connections.find((c) => c.id === 'conn-async');
  expect(asyncConn?.metadata).toEqual({ type: 'async' });

  const dataConn = connections.find((c) => c.id === 'conn-data');
  expect(dataConn?.metadata).toEqual({ type: 'data' });
});
