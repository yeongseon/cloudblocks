import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ArchitectureModel } from '@cloudblocks/schema';
import { useArchitectureStore } from '../../architectureStore';
import { validateArchitectureShape } from '../persistenceSlice';

const FIVE_MB = 5 * 1024 * 1024;

function seedStore(): void {
  const now = '2026-01-01T00:00:00.000Z';
  useArchitectureStore.setState({
    workspace: {
      id: 'ws-seed',
      name: 'Seed Workspace',
      architecture: {
        id: 'arch-seed',
        name: 'Seed Architecture',
        version: '1',
        nodes: [],
        connections: [],
        externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } }],
        createdAt: now,
        updatedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    },
    workspaces: [],
    validationResult: null,
    canUndo: false,
    canRedo: false,
  });
}

function makeValidNodesPayload(): Record<string, unknown> {
  return {
    id: 'import-1',
    name: 'Import',
    version: '1',
    nodes: [
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
      },
      {
        id: 'block-1',
        name: 'VM',
        kind: 'resource',
        layer: 'resource',
        resourceType: 'web_compute',
        category: 'compute',
        provider: 'azure',
        parentId: 'plate-1',
        position: { x: 1, y: 0.5, z: 1 },
      },
    ],
    connections: [{ id: 'conn-1', sourceId: 'block-1', targetId: 'plate-1', type: 'dataflow' }],
  };
}

describe('persistenceSlice branches', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    seedStore();
  });

  describe('validateArchitectureShape', () => {
    it('rejects invalid root and missing nodes/legacy arrays', () => {
      expect(() => validateArchitectureShape('invalid-root')).toThrow('root must be an object');
      expect(() => validateArchitectureShape({ name: 'missing-nodes' })).toThrow(
        'expected nodes[] or legacy plates[] + blocks[]'
      );
    });

    it('rejects malformed node fields and invalid parent references', () => {
      const badNode = {
        nodes: [{ id: 1, name: 'Bad', kind: 'container', layer: 'region', position: { x: 0, y: 0, z: 0 }, size: { width: 1, height: 1, depth: 1 } }],
        connections: [],
      };
      const badResourceParent = {
        nodes: [
          {
            id: 'res-1',
            name: 'Orphan',
            kind: 'resource',
            layer: 'resource',
            resourceType: 'web_compute',
            category: 'compute',
            parentId: 'missing',
            position: { x: 0, y: 0, z: 0 },
          },
        ],
      };

      expect(() => validateArchitectureShape(badNode)).toThrow('id must be a string');
      expect(() => validateArchitectureShape(badResourceParent)).toThrow('does not reference an existing container node');
    });

    it('rejects malformed legacy plates and blocks', () => {
      const badPlate = {
        plates: [{ id: 'plate-1', name: 'Bad', type: 'invalid-type', position: { x: 0, y: 0, z: 0 }, size: { width: 1, height: 1, depth: 1 } }],
        blocks: [],
      };
      const badBlock = {
        plates: [{ id: 'plate-1', name: 'Region', type: 'region', position: { x: 0, y: 0, z: 0 }, size: { width: 1, height: 1, depth: 1 } }],
        blocks: [{ id: 'block-1', name: 'Bad', category: 'compute', placementId: 12, position: { x: 0, y: 0, z: 0 } }],
      };
      const badPlacement = {
        plates: [{ id: 'plate-1', name: 'Region', type: 'region', position: { x: 0, y: 0, z: 0 }, size: { width: 1, height: 1, depth: 1 } }],
        blocks: [{ id: 'block-1', name: 'Bad', category: 'compute', placementId: 'missing-plate', position: { x: 0, y: 0, z: 0 } }],
      };

      expect(() => validateArchitectureShape(badPlate)).toThrow('type must be one of global, edge, region, zone, or subnet');
      expect(() => validateArchitectureShape(badBlock)).toThrow('placementId must be a string');
      expect(() => validateArchitectureShape(badPlacement)).toThrow('does not reference an existing plate');
    });

    it('validates connection endpoints and external actor branches', () => {
      const validWithDefaultActor = {
        ...makeValidNodesPayload(),
        connections: [{ id: 'conn-1', sourceId: 'ext-internet', targetId: 'block-1', type: 'dataflow' }],
      };
      const validActorWithoutPosition = {
        ...makeValidNodesPayload(),
        externalActors: [{ id: 'ext-partner', name: 'Partner', type: 'internet' }],
        connections: [{ id: 'conn-1', sourceId: 'ext-partner', targetId: 'block-1', type: 'dataflow' }],
      };
      const invalidSource = {
        ...makeValidNodesPayload(),
        connections: [{ id: 'conn-1', sourceId: 'missing', targetId: 'block-1', type: 'dataflow' }],
      };
      const invalidTarget = {
        ...makeValidNodesPayload(),
        connections: [{ id: 'conn-1', sourceId: 'block-1', targetId: 'missing', type: 'dataflow' }],
      };

      expect(validateArchitectureShape(validWithDefaultActor)).toEqual({ valid: true });
      expect(validateArchitectureShape(validActorWithoutPosition)).toEqual({ valid: true });
      expect(() => validateArchitectureShape(invalidSource)).toThrow('sourceId "missing" does not reference an existing block, plate, or external actor');
      expect(() => validateArchitectureShape(invalidTarget)).toThrow('targetId "missing" does not reference an existing block, plate, or external actor');
    });
  });

  describe('importArchitecture', () => {
    it('imports legacy plates+blocks format and maps optional fields', () => {
      const legacy = {
        id: 'legacy-import',
        name: 'Legacy Import',
        version: '1',
        plates: [
          {
            id: 'plate-1',
            name: 'Region',
            type: 'region',
            parentId: null,
            position: { x: 0, y: 0, z: 0 },
            size: { width: 16, height: 0.3, depth: 20 },
            metadata: { team: 'platform' },
            subnetAccess: 'public',
            profileId: 'network-hub',
          },
        ],
        blocks: [
          {
            id: 'block-1',
            name: 'App Service',
            category: 'compute',
            placementId: 'plate-1',
            position: { x: 1, y: 0.5, z: 1 },
            subtype: 'app-service',
            provider: 'gcp',
            metadata: { env: 'prod' },
            config: { tier: 'basic' },
          },
          {
            id: 'block-2',
            name: 'Queue',
            category: 'messaging',
            placementId: 'plate-1',
            position: { x: 2, y: 0.5, z: 2 },
          },
        ],
      };

      const result = useArchitectureStore.getState().importArchitecture(JSON.stringify(legacy));
      const architecture = useArchitectureStore.getState().workspace.architecture as ArchitectureModel;
      const plate = architecture.nodes.find((node) => node.id === 'plate-1');
      const app = architecture.nodes.find((node) => node.id === 'block-1');
      const queue = architecture.nodes.find((node) => node.id === 'block-2');

      expect(result).toBeNull();
      expect(plate).toMatchObject({ category: 'network', subnetAccess: 'public', profileId: 'network-hub' });
      expect(app).toMatchObject({ resourceType: 'app-service', provider: 'gcp', subtype: 'app-service', config: { tier: 'basic' } });
      expect(queue).toMatchObject({ resourceType: 'messaging', provider: 'azure' });
      expect(architecture.externalActors).toEqual([
        { id: 'ext-internet', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
      ]);
    });

    it('imports new nodes format with empty nodes and handles actor position fallback', () => {
      const model = {
        id: 'nodes-import',
        name: 'Nodes Import',
        version: '2',
        nodes: [],
        connections: [],
        externalActors: [
          { id: 'ext-1', name: 'Internet', type: 'internet' },
        ],
      };

      const result = useArchitectureStore.getState().importArchitecture(JSON.stringify(model));
      const architecture = useArchitectureStore.getState().workspace.architecture;

      expect(result).toBeNull();
      expect(architecture.nodes).toEqual([]);
      expect(architecture.externalActors).toEqual([
        { id: 'ext-1', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
      ]);
    });

    it('returns errors for invalid JSON and oversize payloads', () => {
      const invalidJsonResult = useArchitectureStore.getState().importArchitecture('this-is-not-json');

      const oversized = {
        ...makeValidNodesPayload(),
        padding: 'x'.repeat(FIVE_MB + 128),
      };
      const oversizeResult = useArchitectureStore.getState().importArchitecture(JSON.stringify(oversized));

      expect(typeof invalidJsonResult).toBe('string');
      expect(oversizeResult).toBe('Import exceeds 5MB limit');
    });
  });
});
