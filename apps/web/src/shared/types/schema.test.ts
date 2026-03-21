import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContainerNode, LeafNode, Workspace } from './index';
import {
  SCHEMA_VERSION,
  createBlankArchitecture,
  deserialize,
  serialize,
} from './schema';

function createWorkspace(id: string): Workspace {
  return {
    id,
    name: `Workspace ${id}`,
    architecture: {
      id: `arch-${id}`,
      name: `Architecture ${id}`,
      version: '1',
      nodes: [],
      connections: [],
      externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
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
    expect(parsed.workspaces).toEqual(workspaces);
  });

  it('deserialize parses valid data', () => {
    const workspaces = [createWorkspace('w1')];
    const json = JSON.stringify({ schemaVersion: SCHEMA_VERSION, workspaces });

    const parsed = deserialize(json);

    expect(parsed).toEqual(workspaces);
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
                id: 'plate-1',
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
            externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const result = deserialize(JSON.stringify(legacyData));
    const plate = result[0].architecture.nodes.find((node): node is ContainerNode => node.kind === 'container');

    expect(plate).toBeDefined();
    if (!plate) {
      throw new Error('Expected migrated container node');
    }
    expect(plate.profileId).toBe('network-platform');
    expect(plate.size.height).toBe(0.7);
    expect(plate.size.width).toBe(16);
    expect(plate.size.depth).toBe(20);
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
                id: 'plate-1',
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
            externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const result = deserialize(JSON.stringify(data));
    const plate = result[0].architecture.nodes.find((node): node is ContainerNode => node.kind === 'container');

    expect(plate).toBeDefined();
    if (!plate) {
      throw new Error('Expected migrated container node');
    }
    expect(plate.profileId).toBe('network-hub');
    expect(plate.size.width).toBe(20);
    expect(plate.size.depth).toBe(24);
    expect(plate.size.height).toBe(0.7);
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

    expect(result[0].architecture.externalActors[0].position).toEqual({ x: -3, y: 0, z: 5 });
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
                placementId: 'plate-1',
                position: { x: 1, y: 0.5, z: 1 },
                metadata: {},
                provider: 'aws',
              },
            ],
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

    expect(() => deserialize(JSON.stringify(oldData))).toThrow(
      'Incompatible workspace format: v0.1.0 is no longer supported.'
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
      'Incompatible workspace format: v0.2.0 is no longer supported.'
    );
  });

  it('roundtrips blocks with subtype and config via serialize/deserialize', () => {
    const container: ContainerNode = {
      id: 'plate-1',
      name: 'Subnet',
      kind: 'container',
      layer: 'subnet',
      resourceType: 'subnet',
      category: 'network',
      provider: 'azure',
      parentId: null,
      position: { x: 0, y: 0, z: 0 },
      size: { width: 6, height: 0.5, depth: 8 },
      metadata: {},
      subnetAccess: 'public',
      profileId: 'subnet-service',
    };
    const leaf: LeafNode = {
      id: 'blk-1',
      name: 'Lambda',
      kind: 'resource',
      layer: 'resource',
      resourceType: 'web_compute',
      category: 'compute',
      provider: 'aws',
      parentId: 'plate-1',
      position: { x: 1, y: 0.5, z: 1 },
      metadata: {},
      subtype: 'lambda',
      config: { runtime: 'nodejs20.x', memorySize: 512 },
    };

    const workspaces: Workspace[] = [
      {
        id: 'ws-1',
        name: 'Test',
        architecture: {
          id: 'arch-1',
          name: 'Test',
          version: '1',
          nodes: [container, leaf],
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
    const parsed = deserialize(json);
    const block = parsed[0].architecture.nodes.find((node): node is LeafNode => node.kind === 'resource');

    expect(block).toBeDefined();
    if (!block) {
      throw new Error('Expected roundtripped resource node');
    }
    expect(block.subtype).toBe('lambda');
    expect(block.config).toEqual({ runtime: 'nodejs20.x', memorySize: 512 });
  });

  it('deserialize throws when schemaVersion is missing', () => {
    const json = JSON.stringify({ workspaces: [] });

    expect(() => deserialize(json)).toThrow(
      new Error('Missing schemaVersion in serialized data')
    );
  });

  it('deserialize warns on schema version mismatch and still returns workspaces', () => {
    const workspaces = [createWorkspace('w1')];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const json = JSON.stringify({ schemaVersion: '9.9.9', workspaces });

    const parsed = deserialize(json);

    expect(parsed).toEqual(workspaces);
    expect(warnSpy).toHaveBeenCalledWith(
      `Schema version mismatch: expected ${SCHEMA_VERSION}, got 9.9.9. Data may need migration.`
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
      nodes: [],
      connections: [],
      externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
      createdAt: '2026-02-03T04:05:06.000Z',
      updatedAt: '2026-02-03T04:05:06.000Z',
    });
  });

  it('roundtrips with serialize and deserialize', () => {
    const workspaces = [createWorkspace('w1'), createWorkspace('w2')];

    const json = serialize(workspaces);
    const parsed = deserialize(json);

    expect(parsed).toEqual(workspaces);
  });
});
