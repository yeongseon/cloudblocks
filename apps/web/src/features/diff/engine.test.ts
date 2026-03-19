import { describe, expect, it } from 'vitest';

import type { ArchitectureModel } from '../../shared/types';
import type { ModifiedEntity, PropertyChange } from '../../shared/types/diff';
import { computeArchitectureDiff, getDiffState, normalizeArchitecture } from './engine';

function createBaseArchitecture(): ArchitectureModel {
  return {
    id: 'arch-1',
    name: 'Test Architecture',
    version: '1.0',
    plates: [
      {
        id: 'plate-1',
        name: 'Network',
        type: 'region',
        parentId: null,
        children: ['plate-2'],
        position: { x: 0, y: 0, z: 0 },
        size: { width: 16, height: 0.3, depth: 20 },
        metadata: {},
      },
      {
        id: 'plate-2',
        name: 'Public Subnet',
        type: 'subnet',
        subnetAccess: 'public',
        parentId: 'plate-1',
        children: ['block-1', 'block-2'],
        position: { x: 1, y: 0, z: 1 },
        size: { width: 6, height: 0.3, depth: 8 },
        metadata: {},
      },
    ],
    blocks: [
      {
        id: 'block-1',
        name: 'Gateway',
        category: 'gateway',
        placementId: 'plate-2',
        position: { x: 0, y: 0, z: 0 },
        metadata: {},
      },
      {
        id: 'block-2',
        name: 'VM',
        category: 'compute',
        placementId: 'plate-2',
        position: { x: 2, y: 0, z: 0 },
        metadata: {},
      },
    ],
    connections: [
      {
        id: 'conn-1',
        sourceId: 'block-1',
        targetId: 'block-2',
        type: 'dataflow',
        metadata: {},
      },
    ],
    externalActors: [{ id: 'ext-1', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function createEmptyArchitecture(id: string): ArchitectureModel {
  return {
    id,
    name: 'Empty Architecture',
    version: '1.0',
    plates: [],
    blocks: [],
    connections: [],
    externalActors: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function requireModified<T>(entities: Array<ModifiedEntity<T>>, id: string): ModifiedEntity<T> {
  const modified = entities.find((entity) => entity.id === id);
  if (!modified) {
    throw new Error(`Expected modified entity: ${id}`);
  }

  return modified;
}

function requireChange(changes: PropertyChange[], path: string): PropertyChange {
  const change = changes.find((item) => item.path === path);
  if (!change) {
    throw new Error(`Expected property change at path: ${path}`);
  }

  return change;
}

describe('computeArchitectureDiff', () => {
  it('returns an empty delta for identical architectures', () => {
    const base = createBaseArchitecture();
    const head = createBaseArchitecture();

    const delta = computeArchitectureDiff(base, head);

    expect(delta.plates).toEqual({ added: [], removed: [], modified: [] });
    expect(delta.blocks).toEqual({ added: [], removed: [], modified: [] });
    expect(delta.connections).toEqual({ added: [], removed: [], modified: [] });
    expect(delta.externalActors).toEqual({ added: [], removed: [], modified: [] });
    expect(delta.summary).toEqual({ totalChanges: 0, hasBreakingChanges: false });
  });

  it('ignores root-level createdAt and updatedAt changes', () => {
    const base = createBaseArchitecture();
    const head: ArchitectureModel = {
      ...createBaseArchitecture(),
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-02T00:00:00Z',
    };

    const delta = computeArchitectureDiff(base, head);

    expect(delta.summary).toEqual({ totalChanges: 0, hasBreakingChanges: false });
  });

  it('marks all entities as added when base is empty', () => {
    const base = createEmptyArchitecture('arch-empty');
    const head = createBaseArchitecture();

    const delta = computeArchitectureDiff(base, head);

    expect(delta.plates.added).toHaveLength(2);
    expect(delta.blocks.added).toHaveLength(2);
    expect(delta.connections.added).toHaveLength(1);
    expect(delta.externalActors.added).toHaveLength(1);
    expect(delta.plates.removed).toHaveLength(0);
    expect(delta.blocks.removed).toHaveLength(0);
    expect(delta.connections.removed).toHaveLength(0);
    expect(delta.externalActors.removed).toHaveLength(0);
    expect(delta.summary).toEqual({ totalChanges: 6, hasBreakingChanges: false });
  });

  it('marks all entities as removed when head is empty', () => {
    const base = createBaseArchitecture();
    const head = createEmptyArchitecture('arch-empty-head');

    const delta = computeArchitectureDiff(base, head);

    expect(delta.plates.removed).toHaveLength(2);
    expect(delta.blocks.removed).toHaveLength(2);
    expect(delta.connections.removed).toHaveLength(1);
    expect(delta.externalActors.removed).toHaveLength(1);
    expect(delta.plates.added).toHaveLength(0);
    expect(delta.blocks.added).toHaveLength(0);
    expect(delta.connections.added).toHaveLength(0);
    expect(delta.externalActors.added).toHaveLength(0);
    expect(delta.summary).toEqual({ totalChanges: 6, hasBreakingChanges: true });
  });

  it('detects added entities across all entity types', () => {
    const base = createBaseArchitecture();
    const head: ArchitectureModel = {
      ...base,
      plates: [
        ...base.plates,
        {
          id: 'plate-3',
          name: 'Private Subnet',
          type: 'subnet',
          subnetAccess: 'private',
          parentId: 'plate-1',
          children: ['block-3'],
          position: { x: 4, y: 0, z: 4 },
          size: { width: 6, height: 0.3, depth: 8 },
          metadata: {},
        },
      ],
      blocks: [
        ...base.blocks,
        {
          id: 'block-3',
          name: 'Storage',
          category: 'storage',
          placementId: 'plate-3',
          position: { x: 1, y: 0, z: 1 },
          metadata: {},
        },
      ],
      connections: [
        ...base.connections,
        {
          id: 'conn-2',
          sourceId: 'block-2',
          targetId: 'block-3',
          type: 'dataflow',
          metadata: {},
        },
      ],
      externalActors: [...base.externalActors, { id: 'ext-2', name: 'Partner API', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
    };

    const delta = computeArchitectureDiff(base, head);

    expect(delta.plates.added.map((plate) => plate.id)).toEqual(['plate-3']);
    expect(delta.blocks.added.map((block) => block.id)).toEqual(['block-3']);
    expect(delta.connections.added.map((connection) => connection.id)).toEqual(['conn-2']);
    expect(delta.externalActors.added.map((actor) => actor.id)).toEqual(['ext-2']);
    expect(delta.summary).toEqual({ totalChanges: 4, hasBreakingChanges: false });
  });

  it('detects removed entities across all entity types', () => {
    const base = createBaseArchitecture();
    const head: ArchitectureModel = {
      ...base,
      plates: base.plates.filter((plate) => plate.id !== 'plate-2'),
      blocks: base.blocks.filter((block) => block.id !== 'block-2'),
      connections: base.connections.filter((connection) => connection.id !== 'conn-1'),
      externalActors: base.externalActors.filter((actor) => actor.id !== 'ext-1'),
    };

    const delta = computeArchitectureDiff(base, head);

    expect(delta.plates.removed.map((plate) => plate.id)).toEqual(['plate-2']);
    expect(delta.blocks.removed.map((block) => block.id)).toEqual(['block-2']);
    expect(delta.connections.removed.map((connection) => connection.id)).toEqual(['conn-1']);
    expect(delta.externalActors.removed.map((actor) => actor.id)).toEqual(['ext-1']);
    expect(delta.summary).toEqual({ totalChanges: 4, hasBreakingChanges: true });
  });

  it('detects modified entities across all entity types', () => {
    const base = createBaseArchitecture();
    const head: ArchitectureModel = {
      ...base,
      plates: base.plates.map((plate) =>
        plate.id === 'plate-1' ? { ...plate, name: 'Core Network' } : plate,
      ),
      blocks: base.blocks.map((block) =>
        block.id === 'block-2'
          ? {
              ...block,
              category: 'storage',
              position: { x: 6, y: 2, z: 3 },
              metadata: { ...block.metadata, region: 'eastus' },
            }
          : block,
      ),
      connections: base.connections.map((connection) => ({
        ...connection,
        metadata: { ...connection.metadata, protocol: 'https' },
      })),
      externalActors: base.externalActors.map((actor) => ({ ...actor, name: 'Public Internet' })),
    };

    const delta = computeArchitectureDiff(base, head);

    expect(delta.plates.modified).toHaveLength(1);
    expect(delta.blocks.modified).toHaveLength(1);
    expect(delta.connections.modified).toHaveLength(1);
    expect(delta.externalActors.modified).toHaveLength(1);

    expect(requireModified(delta.plates.modified, 'plate-1').changes.map((change) => change.path)).toContain(
      'name',
    );
    expect(requireModified(delta.blocks.modified, 'block-2').changes.map((change) => change.path)).toContain(
      'category',
    );
    expect(
      requireModified(delta.connections.modified, 'conn-1').changes.map((change) => change.path),
    ).toContain('metadata.protocol');
    expect(requireModified(delta.externalActors.modified, 'ext-1').changes.map((change) => change.path)).toContain(
      'name',
    );
  });

  it('produces property-level changes with paths and values', () => {
    const base = createBaseArchitecture();
    const head: ArchitectureModel = {
      ...base,
      blocks: base.blocks.map((block) =>
        block.id === 'block-1'
          ? {
              ...block,
              name: 'Gateway Prime',
              position: { ...block.position, x: 5 },
              metadata: { ...block.metadata, region: 'westus3' },
            }
          : block,
      ),
    };

    const delta = computeArchitectureDiff(base, head);
    const modifiedBlock = requireModified(delta.blocks.modified, 'block-1');

    expect(requireChange(modifiedBlock.changes, 'name')).toEqual({
      path: 'name',
      oldValue: 'Gateway',
      newValue: 'Gateway Prime',
    });
    expect(requireChange(modifiedBlock.changes, 'position.x')).toEqual({
      path: 'position.x',
      oldValue: 0,
      newValue: 5,
    });
    expect(requireChange(modifiedBlock.changes, 'metadata.region')).toEqual({
      path: 'metadata.region',
      oldValue: undefined,
      newValue: 'westus3',
    });
  });

  it('detects nested metadata object changes', () => {
    const base = createBaseArchitecture();
    const baseWithMetadata: ArchitectureModel = {
      ...base,
      blocks: base.blocks.map((block) =>
        block.id === 'block-1'
          ? {
              ...block,
              metadata: {
                tags: {
                  env: 'dev',
                  owner: 'team-a',
                },
              },
            }
          : block,
      ),
    };
    const head: ArchitectureModel = {
      ...baseWithMetadata,
      blocks: baseWithMetadata.blocks.map((block) =>
        block.id === 'block-1'
          ? {
              ...block,
              metadata: {
                tags: {
                  env: 'prod',
                  owner: 'team-a',
                },
                region: 'eastus2',
              },
            }
          : block,
      ),
    };

    const delta = computeArchitectureDiff(baseWithMetadata, head);
    const modifiedBlock = requireModified(delta.blocks.modified, 'block-1');

    expect(modifiedBlock.changes.map((change) => change.path)).toContain('metadata.tags.env');
    expect(modifiedBlock.changes.map((change) => change.path)).toContain('metadata.region');
  });

  it('tracks position changes as position.x, position.y, and position.z', () => {
    const base = createBaseArchitecture();
    const head: ArchitectureModel = {
      ...base,
      blocks: base.blocks.map((block) =>
        block.id === 'block-2'
          ? {
              ...block,
              position: { x: -2, y: 3, z: 9 },
            }
          : block,
      ),
    };

    const delta = computeArchitectureDiff(base, head);
    const modifiedBlock = requireModified(delta.blocks.modified, 'block-2');

    expect(modifiedBlock.changes.map((change) => change.path).sort()).toEqual([
      'position.x',
      'position.y',
      'position.z',
    ]);
  });

  it('is immune to entity array reorder and plate children reorder', () => {
    const base = createBaseArchitecture();
    const head: ArchitectureModel = {
      ...base,
      plates: [...base.plates]
        .reverse()
        .map((plate) =>
          plate.id === 'plate-2' ? { ...plate, children: [...plate.children].reverse() } : { ...plate },
        ),
      blocks: [...base.blocks].reverse(),
      connections: [...base.connections].reverse(),
      externalActors: [...base.externalActors].reverse(),
    };

    const delta = computeArchitectureDiff(base, head);

    expect(delta.summary).toEqual({ totalChanges: 0, hasBreakingChanges: false });
  });

  it('computes summary totalChanges correctly', () => {
    const base = createBaseArchitecture();
    const head: ArchitectureModel = {
      ...base,
      plates: base.plates.filter((plate) => plate.id !== 'plate-2'),
      blocks: base.blocks.map((block) =>
        block.id === 'block-1' ? { ...block, name: 'Gateway Updated' } : block,
      ),
      connections: [
        ...base.connections,
        {
          id: 'conn-2',
          sourceId: 'ext-1',
          targetId: 'block-1',
          type: 'dataflow',
          metadata: {},
        },
      ],
      externalActors: [...base.externalActors, { id: 'ext-2', name: 'Partner API', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
    };

    const delta = computeArchitectureDiff(base, head);

    expect(delta.summary).toEqual({ totalChanges: 4, hasBreakingChanges: false });
  });

  it('flags breaking changes when blocks are removed', () => {
    const base = createBaseArchitecture();
    const head: ArchitectureModel = {
      ...base,
      blocks: base.blocks.filter((block) => block.id !== 'block-1'),
    };

    const delta = computeArchitectureDiff(base, head);

    expect(delta.summary.hasBreakingChanges).toBe(true);
  });

  it('flags breaking changes when connections are removed', () => {
    const base = createBaseArchitecture();
    const head: ArchitectureModel = {
      ...base,
      connections: [],
    };

    const delta = computeArchitectureDiff(base, head);

    expect(delta.summary.hasBreakingChanges).toBe(true);
  });

  it('keeps non-breaking changes as non-breaking for additions and modifications', () => {
    const base = createBaseArchitecture();
    const head: ArchitectureModel = {
      ...base,
      blocks: [
        ...base.blocks,
        {
          id: 'block-3',
          name: 'App Storage',
          category: 'storage',
          placementId: 'plate-2',
          position: { x: 3, y: 0, z: 1 },
          metadata: {},
        },
      ],
      externalActors: base.externalActors.map((actor) => ({ ...actor, name: 'Public Internet' })),
    };

    const delta = computeArchitectureDiff(base, head);

    expect(delta.summary.hasBreakingChanges).toBe(false);
  });

  it('returns correct diff states for added, removed, modified, and unchanged entities', () => {
    const base = createBaseArchitecture();
    const head: ArchitectureModel = {
      ...base,
      plates: base.plates.filter((plate) => plate.id !== 'plate-2'),
      blocks: [
        ...base.blocks,
        {
          id: 'block-3',
          name: 'Cache',
          category: 'compute',
          placementId: 'plate-1',
          position: { x: 0, y: 0, z: 0 },
          metadata: {},
        },
      ],
      externalActors: base.externalActors.map((actor) => ({ ...actor, name: 'Internet Edge' })),
    };

    const delta = computeArchitectureDiff(base, head);

    expect(getDiffState('block-3', delta)).toBe('added');
    expect(getDiffState('plate-2', delta)).toBe('removed');
    expect(getDiffState('ext-1', delta)).toBe('modified');
    expect(getDiffState('block-1', delta)).toBe('unchanged');
  });

  it('detects mixed adds, removes, and modifications across all entity types', () => {
    const base = createBaseArchitecture();
    const head: ArchitectureModel = {
      ...base,
      plates: [
        { ...base.plates[0], metadata: { region: 'eastus' } },
        { ...base.plates[1], name: 'Subnet A', children: ['block-2'] },
        {
          id: 'plate-3',
          name: 'Analytics Subnet',
          type: 'subnet',
          subnetAccess: 'private',
          parentId: 'plate-1',
          children: ['block-3'],
          position: { x: 6, y: 0, z: 6 },
          size: { width: 6, height: 0.3, depth: 8 },
          metadata: {},
        },
      ],
      blocks: [
        { ...base.blocks[1], name: 'Application VM' },
        {
          id: 'block-3',
          name: 'Analytics DB',
          category: 'database',
          placementId: 'plate-3',
          position: { x: 1, y: 0, z: 1 },
          metadata: {},
        },
      ],
      connections: [
        {
          id: 'conn-2',
          sourceId: 'block-3',
          targetId: 'block-2',
          type: 'dataflow',
          metadata: {},
        },
      ],
      externalActors: [
        { ...base.externalActors[0], name: 'Public Internet' },
        { id: 'ext-2', name: 'Partner API', type: 'internet' , position: { x: -3, y: 0, z: 5 } },
      ],
    };

    const delta = computeArchitectureDiff(base, head);

    expect(delta.plates.added).toHaveLength(1);
    expect(delta.plates.modified).toHaveLength(2);
    expect(delta.blocks.added).toHaveLength(1);
    expect(delta.blocks.removed).toHaveLength(1);
    expect(delta.blocks.modified).toHaveLength(1);
    expect(delta.connections.added).toHaveLength(1);
    expect(delta.connections.removed).toHaveLength(1);
    expect(delta.externalActors.added).toHaveLength(1);
    expect(delta.externalActors.modified).toHaveLength(1);
    expect(delta.summary).toEqual({ totalChanges: 10, hasBreakingChanges: true });
  });

  it('detects plate children membership changes', () => {
    const base = createBaseArchitecture();
    const head: ArchitectureModel = {
      ...base,
      plates: base.plates.map((plate) =>
        plate.id === 'plate-2'
          ? {
              ...plate,
              children: ['block-3', 'block-2', 'block-1'],
            }
          : plate,
      ),
    };

    const delta = computeArchitectureDiff(base, head);
    const modifiedPlate = requireModified(delta.plates.modified, 'plate-2');
    const childrenChange = requireChange(modifiedPlate.changes, 'children');

    expect(childrenChange.oldValue).toEqual(['block-1', 'block-2']);
    expect(childrenChange.newValue).toEqual(['block-1', 'block-2', 'block-3']);
  });

  it('skips undefined-to-undefined properties in nested objects', () => {
    const base = createBaseArchitecture();
    const baseWithUndefined: ArchitectureModel = {
      ...base,
      blocks: base.blocks.map((block) =>
        block.id === 'block-1'
          ? {
              ...block,
              metadata: {
                optional: undefined,
                nested: {
                  keep: undefined,
                  region: 'eastus',
                },
              },
            }
          : block,
      ),
    };
    const head: ArchitectureModel = {
      ...baseWithUndefined,
      blocks: baseWithUndefined.blocks.map((block) =>
        block.id === 'block-1'
          ? {
              ...block,
              metadata: {
                optional: undefined,
                nested: {
                  keep: undefined,
                  region: 'westus',
                },
              },
            }
          : block,
      ),
    };

    const delta = computeArchitectureDiff(baseWithUndefined, head);
    const modifiedBlock = requireModified(delta.blocks.modified, 'block-1');
    const paths = modifiedBlock.changes.map((change) => change.path);

    expect(paths).toContain('metadata.nested.region');
    expect(paths).not.toContain('metadata.optional');
    expect(paths).not.toContain('metadata.nested.keep');
  });
});

describe('normalizeArchitecture', () => {
  it('sorts entity arrays and plate children by id without mutating input', () => {
    const base = createBaseArchitecture();
    const unsorted: ArchitectureModel = {
      ...base,
      plates: [
        { ...base.plates[1], children: ['block-2', 'block-1'] },
        { ...base.plates[0], children: ['plate-2'] },
      ],
      blocks: [base.blocks[1], base.blocks[0]],
      connections: [
        {
          id: 'conn-2',
          sourceId: 'block-2',
          targetId: 'block-1',
          type: 'dataflow',
          metadata: {},
        },
        base.connections[0],
      ],
      externalActors: [{ id: 'ext-2', name: 'Partner API', type: 'internet' , position: { x: -3, y: 0, z: 5 } }, base.externalActors[0]],
    };

    const normalized = normalizeArchitecture(unsorted);

    expect(normalized.plates.map((plate) => plate.id)).toEqual(['plate-1', 'plate-2']);
    expect(normalized.blocks.map((block) => block.id)).toEqual(['block-1', 'block-2']);
    expect(normalized.connections.map((connection) => connection.id)).toEqual(['conn-1', 'conn-2']);
    expect(normalized.externalActors.map((actor) => actor.id)).toEqual(['ext-1', 'ext-2']);
    expect(normalized.plates[1]?.children).toEqual(['block-1', 'block-2']);

    expect(unsorted.blocks.map((block) => block.id)).toEqual(['block-2', 'block-1']);
    expect(unsorted.plates[0]?.children).toEqual(['block-2', 'block-1']);
  });
});
