import { beforeEach, describe, expect, it } from 'vitest';
import { useArchitectureStore } from '../../store/architectureStore';
import { validateArchitectureShape } from '../../store/slices/persistenceSlice';
import { ingestArchitecture } from '../pipeline';

/**
 * #1954 — every external architecture source runs the same boundary.
 *
 * The property that matters is atomicity: a payload the boundary rejects must
 * leave the workspace, its indexes and undo history exactly as they were.
 */

const VALID_ARCHITECTURE = {
  id: 'arch-valid',
  name: 'Valid',
  version: '1',
  nodes: [
    {
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
    },
    {
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
    },
  ],
  endpoints: [],
  connections: [],
};

function ingest(raw: unknown) {
  return ingestArchitecture(raw, {
    source: 'file-import',
    provider: 'azure',
    name: 'Imported',
    now: '2026-01-01T00:00:00.000Z',
    materializeExternalActors: true,
    regenerateEndpoints: true,
    validateShape: validateArchitectureShape,
  });
}

describe('ingestArchitecture', () => {
  it('accepts a well-formed architecture and regenerates its endpoints', () => {
    const result = ingest(structuredClone(VALID_ARCHITECTURE));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.architecture.endpoints).toHaveLength(12);
  });

  it('canonicalizes a legacy alias before the shape validator sees it', () => {
    const legacy = structuredClone(VALID_ARCHITECTURE);
    legacy.nodes[1].resourceType = 'vm';

    const result = ingest(legacy);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const block = result.architecture.nodes.find((node) => node.id === 'block-1');
    expect(block?.resourceType).toBe('virtual_machine');
    expect(block?.subtype).toBe('vm');
  });

  it('migrates a legacy plates/blocks payload through the same boundary', () => {
    const result = ingest({
      id: 'arch-legacy',
      name: 'Legacy',
      plates: [
        {
          id: 'container-1',
          name: 'Subnet',
          type: 'subnet',
          parentId: null,
          position: { x: 0, y: 0, z: 0 },
          size: { width: 8, height: 1, depth: 8 },
        },
      ],
      blocks: [
        {
          id: 'block-1',
          name: 'VM',
          category: 'compute',
          placementId: 'container-1',
          position: { x: 0, y: 0, z: 0 },
          subtype: 'vm',
        },
      ],
      connections: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.architecture.nodes.find((n) => n.id === 'block-1')?.resourceType).toBe(
      'virtual_machine',
    );
  });

  it('rejects a payload that fails shape validation', () => {
    const result = ingest({ name: 'No nodes' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0].source).toBe('file-import');
    expect(result.issues[0].message).toContain('nodes[]');
  });

  it('rejects a payload that only violates a graph invariant', () => {
    const duplicated = structuredClone(VALID_ARCHITECTURE);
    duplicated.nodes.push(structuredClone(duplicated.nodes[1]));

    const result = ingest(duplicated);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.message.includes('share the id'))).toBe(true);
  });
});

describe('ingestion is atomic at the store boundary', () => {
  beforeEach(() => {
    useArchitectureStore.getState().resetWorkspace();
  });

  function snapshot() {
    const state = useArchitectureStore.getState();
    return {
      architecture: state.workspace.architecture,
      nodeCount: state.nodeById.size,
      canUndo: state.canUndo,
      historyDepth: state.history.past.length,
    };
  }

  it('leaves the workspace untouched when an import is rejected', () => {
    useArchitectureStore.getState().addNode({
      kind: 'container',
      resourceType: 'virtual_network',
      name: 'VNet',
      parentId: null,
      layer: 'region',
    });

    const before = snapshot();
    const duplicated = structuredClone(VALID_ARCHITECTURE);
    duplicated.nodes.push(structuredClone(duplicated.nodes[1]));

    const error = useArchitectureStore
      .getState()
      .importArchitecture(JSON.stringify(duplicated), 'azure');

    expect(error).not.toBeNull();
    const after = snapshot();
    expect(after.architecture).toBe(before.architecture);
    expect(after.nodeCount).toBe(before.nodeCount);
    expect(after.canUndo).toBe(before.canUndo);
    expect(after.historyDepth).toBe(before.historyDepth);
  });

  it('leaves the workspace untouched when replaceArchitecture is rejected', () => {
    const before = snapshot();
    const duplicated = structuredClone(VALID_ARCHITECTURE);
    duplicated.nodes.push(structuredClone(duplicated.nodes[1]));

    expect(() =>
      useArchitectureStore.getState().replaceArchitecture(duplicated as never, 'github-pull'),
    ).toThrow();

    const after = snapshot();
    expect(after.architecture).toBe(before.architecture);
    expect(after.nodeCount).toBe(before.nodeCount);
  });

  it('keeps the store index consistent with the node array after a valid apply', () => {
    useArchitectureStore
      .getState()
      .replaceArchitecture(structuredClone(VALID_ARCHITECTURE) as never, 'ai-generation');

    const state = useArchitectureStore.getState();
    expect(state.nodeById.size).toBe(state.workspace.architecture.nodes.length);
  });
});
