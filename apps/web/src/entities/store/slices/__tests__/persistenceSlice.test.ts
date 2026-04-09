import { beforeEach, describe, expect, it, vi } from 'vitest';
import { endpointId } from '@cloudblocks/schema';

import type { ArchitectureModel } from '@cloudblocks/schema';
import type { ArchitectureTemplate } from '../../../../shared/types/template';
import { useArchitectureStore } from '../../architectureStore';
import { useUIStore } from '../../uiStore';
import { validateArchitectureShape } from '../persistenceSlice';

const FIVE_MB = 5 * 1024 * 1024;

function seedStore(): void {
  const now = '2026-01-01T00:00:00.000Z';
  useArchitectureStore.setState({
    workspace: {
      id: 'ws-seed',
      name: 'Seed Workspace',
      provider: 'azure' as const,
      architecture: {
        id: 'arch-seed',
        name: 'Seed Architecture',
        version: '1',
        nodes: [],
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
        id: 'container-1',
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
        parentId: 'container-1',
        position: { x: 1, y: 0.5, z: 1 },
      },
    ],
    connections: [
      {
        id: 'conn-1',
        from: endpointId('block-1', 'output', 'data'),
        to: endpointId('container-1', 'input', 'data'),
      },
    ],
  };
}

describe('persistenceSlice branches', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    seedStore();
    useUIStore.setState({ activeProvider: 'azure', fitToContentRequested: false });
  });

  describe('validateArchitectureShape', () => {
    it('rejects invalid root and missing nodes/legacy arrays', () => {
      expect(() => validateArchitectureShape('invalid-root')).toThrow('root must be an object');
      expect(() => validateArchitectureShape({ name: 'missing-nodes' })).toThrow(
        'expected nodes[] or legacy plates[] + blocks[]',
      );
    });

    it('rejects malformed node fields and invalid parent references', () => {
      const badNode = {
        nodes: [
          {
            id: 1,
            name: 'Bad',
            kind: 'container',
            layer: 'region',
            position: { x: 0, y: 0, z: 0 },
            size: { width: 1, height: 1, depth: 1 },
          },
        ],
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
      expect(() => validateArchitectureShape(badResourceParent)).toThrow(
        'does not reference an existing container node',
      );
    });

    it('rejects malformed legacy plates and blocks', () => {
      const badPlate = {
        plates: [
          {
            id: 'container-1',
            name: 'Bad',
            type: 'invalid-type',
            position: { x: 0, y: 0, z: 0 },
            size: { width: 1, height: 1, depth: 1 },
          },
        ],
        blocks: [],
      };
      const badBlock = {
        plates: [
          {
            id: 'container-1',
            name: 'Region',
            type: 'region',
            position: { x: 0, y: 0, z: 0 },
            size: { width: 1, height: 1, depth: 1 },
          },
        ],
        blocks: [
          {
            id: 'block-1',
            name: 'Bad',
            category: 'compute',
            placementId: 12,
            position: { x: 0, y: 0, z: 0 },
          },
        ],
      };
      const badPlacement = {
        plates: [
          {
            id: 'container-1',
            name: 'Region',
            type: 'region',
            position: { x: 0, y: 0, z: 0 },
            size: { width: 1, height: 1, depth: 1 },
          },
        ],
        blocks: [
          {
            id: 'block-1',
            name: 'Bad',
            category: 'compute',
            placementId: 'missing-container',
            position: { x: 0, y: 0, z: 0 },
          },
        ],
      };

      expect(() => validateArchitectureShape(badPlate)).toThrow(
        'type must be one of global, edge, region, zone, or subnet',
      );
      expect(() => validateArchitectureShape(badBlock)).toThrow('placementId must be a string');
      expect(() => validateArchitectureShape(badPlacement)).toThrow(
        'does not reference an existing container',
      );
    });

    it('validates connection endpoints and external actor branches', () => {
      const validWithDefaultActor = {
        ...makeValidNodesPayload(),
        connections: [
          {
            id: 'conn-1',
            from: endpointId('ext-internet', 'output', 'data'),
            to: endpointId('block-1', 'input', 'data'),
          },
        ],
      };
      const validActorWithoutPosition = {
        ...makeValidNodesPayload(),
        externalActors: [{ id: 'ext-partner', name: 'Partner', type: 'internet' }],
        connections: [
          {
            id: 'conn-1',
            from: endpointId('ext-partner', 'output', 'data'),
            to: endpointId('block-1', 'input', 'data'),
          },
        ],
      };
      const invalidSource = {
        ...makeValidNodesPayload(),
        connections: [
          {
            id: 'conn-1',
            from: endpointId('missing', 'output', 'data'),
            to: endpointId('block-1', 'input', 'data'),
          },
        ],
      };
      const invalidTarget = {
        ...makeValidNodesPayload(),
        connections: [
          {
            id: 'conn-1',
            from: endpointId('block-1', 'output', 'data'),
            to: endpointId('missing', 'input', 'data'),
          },
        ],
      };

      expect(validateArchitectureShape(validWithDefaultActor)).toEqual({ valid: true });
      expect(validateArchitectureShape(validActorWithoutPosition)).toEqual({ valid: true });
      expect(() => validateArchitectureShape(invalidSource)).toThrow(
        'sourceId "missing" does not reference an existing block, container, or external actor',
      );
      expect(() => validateArchitectureShape(invalidTarget)).toThrow(
        'targetId "missing" does not reference an existing block, container, or external actor',
      );
    });

    it('rejects additional malformed structures for nodes, actors, and connections', () => {
      const invalidConnectionsArray = { ...makeValidNodesPayload(), connections: {} };
      const invalidContainerParentId = {
        nodes: [
          {
            id: 'container-1',
            name: 'Region',
            kind: 'container',
            layer: 'region',
            position: { x: 0, y: 0, z: 0 },
            size: { width: 1, height: 1, depth: 1 },
            parentId: 12,
          },
        ],
      };
      const invalidExternalActorsShape = { ...makeValidNodesPayload(), externalActors: {} };
      const invalidExternalActorEntry = { ...makeValidNodesPayload(), externalActors: [7] };
      const invalidExternalActorId = {
        ...makeValidNodesPayload(),
        externalActors: [{ id: 7, name: 'Internet', type: 'internet' }],
      };
      const invalidExternalActorPosition = {
        ...makeValidNodesPayload(),
        externalActors: [{ id: 'ext-1', name: 'Internet', type: 'internet', position: 'invalid' }],
      };
      const invalidConnectionEntry = { ...makeValidNodesPayload(), connections: [7] };
      const invalidConnectionId = {
        ...makeValidNodesPayload(),
        connections: [
          {
            id: 7,
            from: endpointId('block-1', 'output', 'data'),
            to: endpointId('container-1', 'input', 'data'),
          },
        ],
      };
      const invalidConnectionShape = {
        ...makeValidNodesPayload(),
        connections: [{ id: 'conn-1' }],
      };

      expect(() => validateArchitectureShape(invalidConnectionsArray)).toThrow(
        'connections must be an array',
      );
      expect(() => validateArchitectureShape(invalidContainerParentId)).toThrow(
        'parentId must be a string or null',
      );
      expect(() => validateArchitectureShape(invalidExternalActorsShape)).toThrow(
        'externalActors must be an array',
      );
      expect(() => validateArchitectureShape(invalidExternalActorEntry)).toThrow(
        'external actor must be an object',
      );
      expect(() => validateArchitectureShape(invalidExternalActorId)).toThrow(
        'id must be a string',
      );
      expect(() => validateArchitectureShape(invalidExternalActorPosition)).toThrow(
        'position must be an object with x, y, z numbers',
      );
      expect(() => validateArchitectureShape(invalidConnectionEntry)).toThrow(
        'connection must be an object',
      );
      expect(() => validateArchitectureShape(invalidConnectionId)).toThrow('id must be a string');
      expect(() => validateArchitectureShape(invalidConnectionShape)).toThrow(
        'connection must have from/to (v4) or sourceId/targetId (v3)',
      );
    });

    it('rejects v4 endpoint references when explicit endpoints array exists', () => {
      const payload = {
        ...makeValidNodesPayload(),
        endpoints: [
          {
            id: endpointId('block-1', 'output', 'data'),
            nodeId: 'block-1',
            direction: 'output',
            semantic: 'data',
          },
        ],
        connections: [
          {
            id: 'conn-missing-target',
            from: endpointId('block-1', 'output', 'data'),
            to: endpointId('missing', 'input', 'data'),
          },
        ],
      };

      expect(() => validateArchitectureShape(payload)).toThrow(
        'to endpoint "endpoint-missing-input-data" does not exist',
      );

      const missingFrom = {
        ...payload,
        connections: [
          {
            id: 'conn-missing-from',
            from: endpointId('missing', 'output', 'data'),
            to: endpointId('block-1', 'output', 'data'),
          },
        ],
      };

      expect(() => validateArchitectureShape(missingFrom)).toThrow(
        'from endpoint "endpoint-missing-output-data" does not exist',
      );
    });

    it('rejects legacy connection sourceId/targetId references that are missing', () => {
      const invalidLegacySource = {
        ...makeValidNodesPayload(),
        connections: [{ id: 'conn-1', sourceId: 'missing', targetId: 'block-1', type: 'data' }],
      };
      const invalidLegacyTarget = {
        ...makeValidNodesPayload(),
        connections: [{ id: 'conn-1', sourceId: 'block-1', targetId: 'missing', type: 'data' }],
      };

      expect(() => validateArchitectureShape(invalidLegacySource)).toThrow(
        'sourceId "missing" does not reference an existing block, container, or external actor',
      );
      expect(() => validateArchitectureShape(invalidLegacyTarget)).toThrow(
        'targetId "missing" does not reference an existing block, container, or external actor',
      );
    });

    it('rejects additional node and legacy shape edge cases', () => {
      const nonObjectNode = { nodes: [7], connections: [] };
      const invalidNodeKind = {
        nodes: [{ id: 'n1', name: 'Bad', kind: 'unknown', position: { x: 0, y: 0, z: 0 } }],
      };
      const invalidNodePosition = {
        nodes: [
          {
            id: 'n1',
            name: 'Bad',
            kind: 'resource',
            category: 'compute',
            parentId: 'p1',
            position: { x: 0, y: 'y', z: 0 },
          },
        ],
      };
      const invalidContainerSizeShape = {
        nodes: [
          {
            id: 'p1',
            name: 'ContainerBlock',
            kind: 'container',
            layer: 'region',
            parentId: null,
            position: { x: 0, y: 0, z: 0 },
            size: 'bad',
          },
        ],
      };
      const invalidContainerSizeNumbers = {
        nodes: [
          {
            id: 'p1',
            name: 'ContainerBlock',
            kind: 'container',
            layer: 'region',
            parentId: null,
            position: { x: 0, y: 0, z: 0 },
            size: { width: 1, height: 'bad', depth: 1 },
          },
        ],
      };
      const invalidResourceParentType = {
        nodes: [
          {
            id: 'r1',
            name: 'Res',
            kind: 'resource',
            category: 'compute',
            parentId: null,
            position: { x: 0, y: 0, z: 0 },
          },
        ],
      };
      const invalidContainerParentRef = {
        nodes: [
          {
            id: 'p1',
            name: 'ContainerBlock',
            kind: 'container',
            layer: 'region',
            parentId: 'missing',
            position: { x: 0, y: 0, z: 0 },
            size: { width: 1, height: 1, depth: 1 },
          },
        ],
      };
      const nonObjectPlate = { plates: [7], blocks: [] };
      const invalidPlateId = {
        plates: [
          {
            id: 9,
            name: 'ContainerBlock',
            type: 'region',
            position: { x: 0, y: 0, z: 0 },
            size: { width: 1, height: 1, depth: 1 },
          },
        ],
        blocks: [],
      };
      const invalidPlateName = {
        plates: [
          {
            id: 'p1',
            name: 9,
            type: 'region',
            position: { x: 0, y: 0, z: 0 },
            size: { width: 1, height: 1, depth: 1 },
          },
        ],
        blocks: [],
      };
      const nonObjectBlock = {
        plates: [
          {
            id: 'p1',
            name: 'ContainerBlock',
            type: 'region',
            position: { x: 0, y: 0, z: 0 },
            size: { width: 1, height: 1, depth: 1 },
          },
        ],
        blocks: [7],
      };
      const invalidBlockId = {
        plates: [
          {
            id: 'p1',
            name: 'ContainerBlock',
            type: 'region',
            position: { x: 0, y: 0, z: 0 },
            size: { width: 1, height: 1, depth: 1 },
          },
        ],
        blocks: [
          {
            id: 7,
            name: 'Block',
            category: 'compute',
            placementId: 'p1',
            position: { x: 0, y: 0, z: 0 },
          },
        ],
      };
      const invalidBlockName = {
        plates: [
          {
            id: 'p1',
            name: 'ContainerBlock',
            type: 'region',
            position: { x: 0, y: 0, z: 0 },
            size: { width: 1, height: 1, depth: 1 },
          },
        ],
        blocks: [
          {
            id: 'b1',
            name: 7,
            category: 'compute',
            placementId: 'p1',
            position: { x: 0, y: 0, z: 0 },
          },
        ],
      };
      const invalidBlockCategory = {
        plates: [
          {
            id: 'p1',
            name: 'ContainerBlock',
            type: 'region',
            position: { x: 0, y: 0, z: 0 },
            size: { width: 1, height: 1, depth: 1 },
          },
        ],
        blocks: [
          {
            id: 'b1',
            name: 'Block',
            category: 'unknown',
            placementId: 'p1',
            position: { x: 0, y: 0, z: 0 },
          },
        ],
      };

      expect(() => validateArchitectureShape(nonObjectNode)).toThrow('node must be an object');
      expect(() => validateArchitectureShape(invalidNodeKind)).toThrow(
        'kind must be "container" or "resource"',
      );
      expect(() => validateArchitectureShape(invalidNodePosition)).toThrow(
        'position must contain numeric x, y, z values',
      );
      expect(() => validateArchitectureShape(invalidContainerSizeShape)).toThrow(
        'size must be an object with width, height, depth numbers',
      );
      expect(() => validateArchitectureShape(invalidContainerSizeNumbers)).toThrow(
        'size must contain numeric width, height, depth values',
      );
      expect(() => validateArchitectureShape(invalidResourceParentType)).toThrow(
        'resource node parentId must be a string',
      );
      expect(() => validateArchitectureShape(invalidContainerParentRef)).toThrow(
        'does not reference an existing container node',
      );
      expect(() => validateArchitectureShape(nonObjectPlate)).toThrow(
        'container must be an object',
      );
      expect(() => validateArchitectureShape(invalidPlateId)).toThrow('id must be a string');
      expect(() => validateArchitectureShape(invalidPlateName)).toThrow('name must be a string');
      expect(() => validateArchitectureShape(nonObjectBlock)).toThrow('block must be an object');
      expect(() => validateArchitectureShape(invalidBlockId)).toThrow('id must be a string');
      expect(() => validateArchitectureShape(invalidBlockName)).toThrow('name must be a string');
      expect(() => validateArchitectureShape(invalidBlockCategory)).toThrow(
        'category must be one of network, security, delivery, compute, data, messaging, identity, operations',
      );
    });

    it('accepts endpoints arrays containing non-record entries', () => {
      const payload = {
        ...makeValidNodesPayload(),
        endpoints: [
          7,
          { id: endpointId('block-1', 'output', 'data') },
          { id: endpointId('container-1', 'input', 'data') },
        ],
      };

      expect(validateArchitectureShape(payload)).toEqual({ valid: true });
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
            id: 'container-1',
            name: 'Region',
            type: 'region',
            parentId: null,
            position: { x: 0, y: 0, z: 0 },
            size: { width: 16, height: 0.3, depth: 20 },
            metadata: { team: 'platform' },
            profileId: 'network-hub',
          },
        ],
        blocks: [
          {
            id: 'block-1',
            name: 'App Service',
            category: 'compute',
            placementId: 'container-1',
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
            placementId: 'container-1',
            position: { x: 2, y: 0.5, z: 2 },
          },
        ],
      };

      const result = useArchitectureStore.getState().importArchitecture(JSON.stringify(legacy));
      const architecture = useArchitectureStore.getState().workspace
        .architecture as ArchitectureModel;
      const container = architecture.nodes.find((node) => node.id === 'container-1');
      const app = architecture.nodes.find((node) => node.id === 'block-1');
      const queue = architecture.nodes.find((node) => node.id === 'block-2');

      expect(result).toBeNull();
      expect(container).toMatchObject({ category: 'network', profileId: 'network-hub' });
      expect(app).toMatchObject({
        resourceType: 'app-service',
        provider: 'gcp',
        subtype: 'app-service',
        config: { tier: 'basic' },
      });
      expect(queue).toMatchObject({ resourceType: 'message_queue', provider: 'azure' });
      expect(architecture.externalActors).toEqual([
        { id: 'ext-browser', name: 'Client', type: 'browser', position: { x: -12, y: 0, z: 5 } },
        {
          id: 'ext-internet',
          name: 'Internet',
          type: 'internet',
          position: { x: -10, y: 0, z: 5 },
        },
      ]);
    });

    it('imports new nodes format with empty nodes and handles actor position fallback', () => {
      const model = {
        id: 'nodes-import',
        name: 'Nodes Import',
        version: '2',
        nodes: [],
        connections: [],
        endpoints: [],
        externalActors: [{ id: 'ext-1', name: 'Internet', type: 'internet' }],
      };

      const result = useArchitectureStore.getState().importArchitecture(JSON.stringify(model));
      const architecture = useArchitectureStore.getState().workspace.architecture;

      expect(result).toBeNull();
      // Migration converts externalActors into resource block nodes
      expect(architecture.nodes).toHaveLength(1);
      expect(architecture.nodes[0]).toMatchObject({
        id: 'ext-1',
        name: 'Internet',
        kind: 'resource',
        resourceType: 'internet',
        category: 'delivery',
        parentId: null,
        roles: ['external'],
      });
      // Position fallback: actor had no position, so defaults to { x: 4, y: 0, z: 10 }
      expect(architecture.nodes[0].position).toEqual({ x: 4, y: 0, z: 10 });
      expect(architecture.externalActors).toEqual([
        { id: 'ext-1', name: 'Internet', type: 'internet', position: { x: 4, y: 0, z: 10 } },
      ]);
    });

    it('maps v3/v4 connection payload branches', () => {
      const model = {
        id: 'nodes-import-connections',
        name: 'Nodes Import Connections',
        version: '2',
        nodes: [
          {
            id: 'container-1',
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
            name: 'App',
            kind: 'resource',
            layer: 'resource',
            resourceType: 'web_compute',
            category: 'compute',
            provider: 'azure',
            parentId: 'container-1',
            position: { x: 1, y: 0.5, z: 1 },
          },
          {
            id: 'block-2',
            name: 'Queue',
            kind: 'resource',
            layer: 'resource',
            resourceType: 'message_queue',
            category: 'messaging',
            provider: 'azure',
            parentId: 'container-1',
            position: { x: 2, y: 0.5, z: 2 },
          },
        ],
        connections: [
          {
            id: 'conn-v4',
            from: endpointId('block-1', 'output', 'data'),
            to: endpointId('block-2', 'input', 'data'),
            metadata: { source: 'v4' },
          },
          {
            id: 'conn-v4-no-meta',
            from: endpointId('block-2', 'output', 'event'),
            to: endpointId('block-1', 'input', 'event'),
          },
          {
            id: 'conn-v3-typed',
            sourceId: 'block-1',
            targetId: 'block-2',
            type: 'async',
          },
          {
            id: 'conn-v3-untyped',
            sourceId: 'block-2',
            targetId: 'block-1',
          },
        ],
      };

      const result = useArchitectureStore.getState().importArchitecture(JSON.stringify(model));
      const architecture = useArchitectureStore.getState().workspace.architecture;

      expect(result).toBeNull();
      expect(architecture.connections).toEqual([
        {
          id: 'conn-v4',
          from: endpointId('block-1', 'output', 'data'),
          to: endpointId('block-2', 'input', 'data'),
          metadata: { source: 'v4' },
        },
        {
          id: 'conn-v4-no-meta',
          from: endpointId('block-2', 'output', 'event'),
          to: endpointId('block-1', 'input', 'event'),
          metadata: {},
        },
        {
          id: 'conn-v3-typed',
          from: endpointId('block-1', 'output', 'event'),
          to: endpointId('block-2', 'input', 'event'),
          metadata: { type: 'async' },
        },
        {
          id: 'conn-v3-untyped',
          from: endpointId('block-2', 'output', 'data'),
          to: endpointId('block-1', 'input', 'data'),
          metadata: {},
        },
      ]);
    });

    it('returns an error when payload omits both nodes and legacy arrays', () => {
      const model = {
        id: 'minimal-import',
        name: 'Minimal',
        version: '1',
        connections: [],
      };

      const result = useArchitectureStore.getState().importArchitecture(JSON.stringify(model));
      expect(result).toBe(
        'Invalid architecture format: expected nodes[] or legacy plates[] + blocks[]',
      );
    });

    it('returns an error when imported connections are missing id fields', () => {
      const model = {
        id: 'generated-ids-import',
        name: 'Generated Ids',
        version: '1',
        nodes: makeValidNodesPayload().nodes,
        connections: [
          {
            from: endpointId('block-1', 'output', 'data'),
            to: endpointId('block-1', 'input', 'data'),
          },
          {
            sourceId: 'block-1',
            targetId: 'container-1',
            type: 'dataflow',
          },
        ],
      };

      const result = useArchitectureStore.getState().importArchitecture(JSON.stringify(model));
      expect(result).toBe('Invalid connection at index 0: id must be a string');
    });

    it('imports legacy subnet plates with expected resourceType mapping', () => {
      const legacy = {
        id: 'legacy-subnet-import',
        name: 'Legacy Subnet Import',
        version: '1',
        plates: [
          {
            id: 'container-subnet',
            name: 'Subnet',
            type: 'subnet',
            parentId: null,
            position: { x: 0, y: 0, z: 0 },
            size: { width: 8, height: 0.3, depth: 10 },
          },
        ],
        blocks: [
          {
            id: 'block-1',
            name: 'App',
            category: 'compute',
            placementId: 'container-subnet',
            position: { x: 1, y: 0.5, z: 1 },
          },
        ],
      };

      const result = useArchitectureStore.getState().importArchitecture(JSON.stringify(legacy));
      const architecture = useArchitectureStore.getState().workspace
        .architecture as ArchitectureModel;
      const subnetPlate = architecture.nodes.find((node) => node.id === 'container-subnet');

      expect(result).toBeNull();
      expect(subnetPlate).toMatchObject({ resourceType: 'subnet', metadata: {} });
    });

    it('returns errors for invalid JSON and oversize payloads', () => {
      const invalidJsonResult = useArchitectureStore
        .getState()
        .importArchitecture('this-is-not-json');

      const oversized = {
        ...makeValidNodesPayload(),
        padding: 'x'.repeat(FIVE_MB + 128),
      };
      const oversizeResult = useArchitectureStore
        .getState()
        .importArchitecture(JSON.stringify(oversized));

      expect(typeof invalidJsonResult).toBe('string');
      expect(oversizeResult).toBe('Import exceeds 5MB limit');
    });

    it('remaps imported nodes and names when active provider is non-azure', () => {
      useUIStore.setState({ activeProvider: 'aws' });

      const model = {
        id: 'provider-remap-import',
        name: 'Provider Remap Import',
        version: '2',
        nodes: [
          {
            id: 'container-region-default',
            name: 'VNet',
            kind: 'container',
            layer: 'region',
            resourceType: 'virtual_network',
            category: 'network',
            provider: 'azure',
            parentId: null,
            position: { x: 0, y: 0, z: 0 },
            frame: { width: 16, height: 1, depth: 16 },
            subtype: 'vnet',
            metadata: {},
          },
          {
            id: 'container-region-custom',
            name: 'Custom Region',
            kind: 'container',
            layer: 'region',
            resourceType: 'virtual_network',
            category: 'network',
            provider: 'azure',
            parentId: null,
            position: { x: 20, y: 0, z: 20 },
            frame: { width: 16, height: 1, depth: 16 },
            metadata: {},
          },
          {
            id: 'block-vm',
            name: 'Virtual Machine (Worker)',
            kind: 'resource',
            layer: 'resource',
            resourceType: 'virtual_machine',
            category: 'compute',
            provider: 'azure',
            parentId: 'container-region-default',
            position: { x: 1, y: 0, z: 1 },
            subtype: 'vm',
            metadata: {},
          },
        ],
        connections: [],
        endpoints: [],
      };

      const result = useArchitectureStore.getState().importArchitecture(JSON.stringify(model));
      const architecture = useArchitectureStore.getState().workspace.architecture;
      const defaultRegion = architecture.nodes.find(
        (node) => node.id === 'container-region-default',
      );
      const customRegion = architecture.nodes.find((node) => node.id === 'container-region-custom');
      const vmNode = architecture.nodes.find((node) => node.id === 'block-vm');

      expect(result).toBeNull();
      expect(defaultRegion).toMatchObject({ name: 'VPC', provider: 'aws', subtype: 'vpc' });
      expect(customRegion).toMatchObject({ name: 'Custom Region', provider: 'aws' });
      expect(vmNode).toMatchObject({
        name: 'EC2 Instance (Worker)',
        provider: 'aws',
        subtype: 'ec2',
      });
    });
  });

  describe('loadFromTemplate', () => {
    it('remaps template nodes when active provider is non-azure', () => {
      useUIStore.setState({ activeProvider: 'gcp' });

      const template: ArchitectureTemplate = {
        id: 'template-provider-remap',
        name: 'Provider Remap Template',
        description: 'Template for provider remap branch coverage',
        category: 'general' as const,
        difficulty: 'beginner' as const,
        tags: ['test'],
        architecture: {
          name: 'Template Architecture',
          version: '1',
          nodes: [
            {
              id: 'container-region-default',
              name: 'VNet',
              kind: 'container',
              layer: 'region',
              resourceType: 'virtual_network',
              category: 'network',
              provider: 'azure',
              parentId: null,
              position: { x: 0, y: 0, z: 0 },
              frame: { width: 16, height: 1, depth: 16 },
              subtype: 'vnet',
              metadata: {},
            },
            {
              id: 'container-region-custom',
              name: 'Custom Region',
              kind: 'container',
              layer: 'region',
              resourceType: 'virtual_network',
              category: 'network',
              provider: 'azure',
              parentId: null,
              position: { x: 20, y: 0, z: 20 },
              frame: { width: 16, height: 1, depth: 16 },
              metadata: {},
            },
            {
              id: 'block-vm',
              name: 'Virtual Machine',
              kind: 'resource',
              layer: 'resource',
              resourceType: 'virtual_machine',
              category: 'compute',
              provider: 'azure',
              parentId: 'container-region-default',
              position: { x: 1, y: 0, z: 1 },
              subtype: 'vm',
              metadata: {},
            },
          ],
          connections: [],
          endpoints: [],
          externalActors: [],
        },
      };

      useArchitectureStore.getState().loadFromTemplate(template);

      const architecture = useArchitectureStore.getState().workspace.architecture;
      const defaultRegion = architecture.nodes.find(
        (node) => node.id === 'container-region-default',
      );
      const customRegion = architecture.nodes.find((node) => node.id === 'container-region-custom');
      const vmNode = architecture.nodes.find((node) => node.id === 'block-vm');

      expect(defaultRegion).toMatchObject({ name: 'VPC Network', provider: 'gcp', subtype: 'vpc' });
      expect(customRegion).toMatchObject({ name: 'Custom Region', provider: 'gcp' });
      expect(vmNode).toMatchObject({
        name: 'Compute Engine',
        provider: 'gcp',
        subtype: 'compute-engine',
      });
      expect(useUIStore.getState().fitToContentRequested).toBe(false);
    });

    it('remaps external block provider but preserves name and subtype when non-azure', () => {
      useUIStore.setState({ activeProvider: 'aws' });

      const template: ArchitectureTemplate = {
        id: 'template-external-provider',
        name: 'External Block Provider Remap',
        description: 'Verify external blocks get provider remapped but name/subtype preserved',
        category: 'general' as const,
        difficulty: 'beginner' as const,
        tags: ['test'],
        architecture: {
          name: 'Template With External Blocks',
          version: '1',
          nodes: [
            {
              id: 'container-region',
              name: 'VNet',
              kind: 'container',
              layer: 'region',
              resourceType: 'virtual_network',
              category: 'network',
              provider: 'azure',
              parentId: null,
              position: { x: 0, y: 0, z: 0 },
              frame: { width: 16, height: 1, depth: 16 },
              subtype: 'vnet',
              metadata: {},
            },
            {
              id: 'ext-browser',
              name: 'Client',
              kind: 'resource',
              layer: 'resource',
              resourceType: 'browser',
              category: 'delivery',
              provider: 'azure',
              parentId: null,
              position: { x: -6, y: 0, z: 5 },
              metadata: {},
              roles: ['external'],
              subtype: 'custom-browser',
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
              position: { x: -3, y: 0, z: 5 },
              metadata: {},
              roles: ['external'],
            },
          ],
          connections: [],
          endpoints: [],
          externalActors: [],
        },
      };

      useArchitectureStore.getState().loadFromTemplate(template);

      const architecture = useArchitectureStore.getState().workspace.architecture;
      const browser = architecture.nodes.find((node) => node.id === 'ext-browser');
      const internet = architecture.nodes.find((node) => node.id === 'ext-internet');
      const region = architecture.nodes.find((node) => node.id === 'container-region');

      // External blocks: provider remapped, name/subtype preserved
      expect(browser).toMatchObject({
        name: 'Client',
        provider: 'aws',
        resourceType: 'browser',
        roles: ['external'],
        subtype: 'custom-browser',
      });
      expect(internet).toMatchObject({
        name: 'Internet',
        provider: 'aws',
        resourceType: 'internet',
        roles: ['external'],
      });
      // Regular container: provider remapped AND name remapped
      expect(region).toMatchObject({
        name: 'VPC',
        provider: 'aws',
        subtype: 'vpc',
      });
    });
  });
});

// ─── #1535: ExternalActor-to-Block validation tests ────────────

describe('validateArchitectureShape — external resource blocks', () => {
  it('accepts resource nodes with parentId: null for external resource types', () => {
    const payload = {
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
        {
          id: 'ext-browser',
          name: 'Client',
          kind: 'resource',
          layer: 'resource',
          resourceType: 'browser',
          category: 'delivery',
          provider: 'azure',
          parentId: null,
          position: { x: -6, y: 0, z: 5 },
          metadata: {},
          roles: ['external'],
        },
      ],
      endpoints: [],
      connections: [],
    };

    expect(validateArchitectureShape(payload)).toEqual({ valid: true });
  });

  it('rejects non-external resource nodes with parentId: null', () => {
    const payload = {
      nodes: [
        {
          id: 'vm-1',
          name: 'VM',
          kind: 'resource',
          layer: 'resource',
          resourceType: 'virtual_machine',
          category: 'compute',
          provider: 'azure',
          parentId: null,
          position: { x: 0, y: 0, z: 0 },
        },
      ],
      connections: [],
    };

    expect(() => validateArchitectureShape(payload)).toThrow(
      'non-external resource node parentId must be a string',
    );
  });
});
