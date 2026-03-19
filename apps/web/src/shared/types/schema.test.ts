import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Workspace } from './index';
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
      plates: [],
      blocks: [],
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
                type: 'network',
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
    const plate = result[0].architecture.plates[0];

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
                type: 'network',
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
    const plate = result[0].architecture.plates[0];

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

  it('createBlankArchitecture returns the expected default structure', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-03T04:05:06.000Z'));

    const architecture = createBlankArchitecture('arch-1', 'My Architecture');

    expect(architecture).toEqual({
      id: 'arch-1',
      name: 'My Architecture',
      version: '1',
      plates: [],
      blocks: [],
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
