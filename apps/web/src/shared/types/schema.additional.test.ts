import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SCHEMA_VERSION, deserialize } from './schema';

describe('schema deserialize additional branch coverage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('skips non-object nodes and external actors during migration passes', () => {
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      workspaces: [
        {
          id: 'ws-1',
          name: 'Workspace',
          architecture: {
            id: 'arch-1',
            name: 'Architecture',
            version: '1',
            nodes: [
              42,
              {
                id: 'plate-1',
                name: 'Region',
                kind: 'container',
                layer: 'region',
                resourceType: 'virtual_network',
                category: 'network',
                provider: 'azure',
                parentId: null,
                position: { x: 0, y: 0, z: 0 },
                size: { width: 16, height: 0.3, depth: 20 },
                metadata: {},
              },
            ],
            connections: [],
            externalActors: [
              1,
              { id: 'ext-1', name: 'Internet', type: 'internet' },
            ],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const [workspace] = deserialize(JSON.stringify(payload));
    const actor = workspace.architecture.externalActors.find((entry) => entry.id === 'ext-1');
    const container = workspace.architecture.nodes.find(
      (entry): entry is (typeof workspace.architecture.nodes)[number] & { kind: 'container'; profileId?: string } =>
        typeof entry === 'object' && entry !== null && 'kind' in entry && entry.kind === 'container'
    );

    expect(actor?.position).toEqual({ x: -3, y: 0, z: 5 });
    expect(container?.profileId).toBeDefined();
  });

  it('migrates legacy blocks and plates with optional fields and nullish fallbacks', () => {
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      workspaces: [
        {
          id: 'ws-legacy',
          name: 'Legacy',
          architecture: {
            id: 'arch-legacy',
            name: 'Legacy',
            version: '1',
            plates: [
              {
                id: 'plate-1',
                name: 'VNet',
                type: 'region',
                parentId: 'root-parent',
                position: { x: 0, y: 0, z: 0 },
                size: { width: 16, height: 0.3, depth: 20 },
                metadata: { owner: 'team-a' },
                profileId: 'network-hub',
                subnetAccess: 'public',
              },
              {
                id: 'plate-2',
                name: 'Subnet',
                type: 'subnet',
                position: { x: 1, y: 0.3, z: 1 },
                size: { width: 8, height: 0.2, depth: 10 },
              },
            ],
            blocks: [
              {
                id: 'blk-1',
                name: 'App',
                category: 'compute',
                placementId: 'plate-2',
                position: { x: 1, y: 0.5, z: 1 },
                provider: 'aws',
                subtype: 'lambda',
                metadata: { env: 'prod' },
                config: { timeout: 10 },
                aggregation: { mode: 'count', count: 3 },
                roles: ['primary'],
              },
              {
                id: 'blk-2',
                name: 'Queue',
                category: 'messaging',
                placementId: 'plate-2',
                position: { x: 2, y: 0.5, z: 2 },
              },
            ],
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

    const [workspace] = deserialize(JSON.stringify(payload));
    const nodes = workspace.architecture.nodes;
    const parentPlate = nodes.find((node) => node.id === 'plate-1');
    const subnetPlate = nodes.find((node) => node.id === 'plate-2');
    const app = nodes.find((node) => node.id === 'blk-1');
    const queue = nodes.find((node) => node.id === 'blk-2');

    expect(parentPlate).toMatchObject({ parentId: 'root-parent', profileId: 'network-hub', metadata: { owner: 'team-a' } });
    expect(subnetPlate).toMatchObject({ parentId: null, metadata: {} });
    expect(app).toMatchObject({
      resourceType: 'lambda',
      provider: 'aws',
      metadata: { env: 'prod' },
      subtype: 'lambda',
      config: { timeout: 10 },
      aggregation: { mode: 'count', count: 3 },
      roles: ['primary'],
    });
    expect(queue).toMatchObject({ resourceType: 'messaging', provider: 'azure', metadata: {} });
  });

  it('migrates legacy payloads that omit blocks array', () => {
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      workspaces: [
        {
          id: 'ws-legacy',
          name: 'Legacy',
          architecture: {
            id: 'arch-legacy',
            name: 'Legacy',
            version: '1',
            plates: [
              {
                id: 'plate-1',
                name: 'VNet',
                type: 'region',
                position: { x: 0, y: 0, z: 0 },
                size: { width: 16, height: 0.3, depth: 20 },
              },
            ],
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

    const [workspace] = deserialize(JSON.stringify(payload));

    expect(workspace.architecture.nodes).toHaveLength(1);
    expect(workspace.architecture.nodes[0]).toMatchObject({ id: 'plate-1', kind: 'container' });
  });
});
