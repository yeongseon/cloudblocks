import type { Workspace } from '../../../shared/types/index';
import logger from '../../../shared/utils/logger';
import type {
  ArchitectureModel,
  ContainerNode,
  LeafNode,
  ResourceCategory,
} from '@cloudblocks/schema';
import {
  connectionTypeToSemantic,
  endpointId,
  generateEndpointsForNode,
  parseEndpointId,
} from '@cloudblocks/schema';
import type { ArchitectureSnapshot } from '../../../shared/types/learning';
import { saveWorkspaces, loadWorkspaces, saveActiveWorkspaceId, loadActiveWorkspaceId } from '../../../shared/utils/storage';
import { generateId } from '../../../shared/utils/id';
import { useUIStore } from '../uiStore';
import type { ArchitectureSlice, ArchitectureState } from './types';
import {
  createDefaultWorkspace,
  deduplicateWorkspaceName,
  resetTransientState,
  touchModel,
  upsertCurrentWorkspace,
  withHistory,
} from './helpers';

const MAX_IMPORT_SIZE_BYTES = 5 * 1024 * 1024;
const DEFAULT_EXTERNAL_ACTOR_POSITION = { x: -3, y: 0, z: 5 };
type PlateLayerType = 'global' | 'edge' | 'region' | 'zone' | 'subnet';

const VALID_PLATE_TYPES: PlateLayerType[] = ['global', 'edge', 'region', 'zone', 'subnet'];
const VALID_BLOCK_CATEGORIES: ResourceCategory[] = [
  'network',
  'security',
  'edge',
  'compute',
  'data',
  'messaging',
  'operations',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isValidNodeKind = (value: unknown): value is 'container' | 'resource' =>
  value === 'container' || value === 'resource';
const isValidPlateType = (value: unknown): value is PlateLayerType =>
  typeof value === 'string' &&
  VALID_PLATE_TYPES.includes(value as PlateLayerType);

const isValidBlockCategory = (value: unknown): value is ResourceCategory =>
  typeof value === 'string' &&
  VALID_BLOCK_CATEGORIES.includes(value as ResourceCategory);


const validatePosition = (value: unknown, context: string): void => {
  if (!isRecord(value)) {
    throw new Error(`${context}.position must be an object with x, y, z numbers`);
  }

  if (
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isFiniteNumber(value.z)
  ) {
    throw new Error(`${context}.position must contain numeric x, y, z values`);
  }
};

const validateSize = (value: unknown, context: string): void => {
  if (!isRecord(value)) {
    throw new Error(
      `${context}.size must be an object with width, height, depth numbers`
    );
  }

  if (
    !isFiniteNumber(value.width) ||
    !isFiniteNumber(value.height) ||
    !isFiniteNumber(value.depth)
  ) {
    throw new Error(
      `${context}.size must contain numeric width, height, depth values`
    );
  }
};

export const validateArchitectureShape = (
  imported: unknown,
): { valid: true } => {
  if (!isRecord(imported)) {
    throw new Error('Invalid architecture format: root must be an object');
  }

  const hasNodes = Array.isArray(imported.nodes);
  const hasLegacy = Array.isArray(imported.plates) && Array.isArray(imported.blocks);
  if (!hasNodes && !hasLegacy) {
    throw new Error('Invalid architecture format: expected nodes[] or legacy plates[] + blocks[]');
  }

  if (
    imported.connections !== undefined &&
    !Array.isArray(imported.connections)
  ) {
    throw new Error('Invalid architecture format: connections must be an array');
  }

  const containerIds = new Set<string>();
  const resourceIds = new Set<string>();

  if (hasNodes) {
    const nodes = (imported as Record<string, unknown>).nodes as unknown[];
    nodes.forEach((node, index) => {
      const context = `Invalid node at index ${index}`;
      if (!isRecord(node)) {
        throw new Error(`${context}: node must be an object`);
      }

      if (typeof node.id !== 'string') {
        throw new Error(`${context}: id must be a string`);
      }
      if (typeof node.name !== 'string') {
        throw new Error(`${context}: name must be a string`);
      }
      if (!isValidNodeKind(node.kind)) {
        throw new Error(`${context}: kind must be "container" or "resource"`);
      }
      validatePosition(node.position, context);

      if (node.kind === 'container') {
        if (!isValidPlateType(node.layer)) {
          throw new Error(`${context}: layer must be one of global, edge, region, zone, or subnet`);
        }
        validateSize(node.size, context);
        if (node.parentId !== null && node.parentId !== undefined && typeof node.parentId !== 'string') {
          throw new Error(`${context}: parentId must be a string or null`);
        }
        containerIds.add(node.id);
        return;
      }

      if (!isValidBlockCategory(node.category)) {
        throw new Error(
          `${context}: category must be one of network, security, edge, compute, data, messaging, operations`
        );
      }
      if (typeof node.parentId !== 'string') {
        throw new Error(`${context}: resource node parentId must be a string`);
      }
      resourceIds.add(node.id);
    });

    nodes.forEach((node, index) => {
      const context = `Invalid node at index ${index}`;
      if (!isRecord(node)) {
        return;
      }

      if (node.kind === 'container' && typeof node.parentId === 'string' && !containerIds.has(node.parentId)) {
        throw new Error(`${context}: parentId "${node.parentId}" does not reference an existing container node`);
      }

      if (node.kind === 'resource' && typeof node.parentId === 'string' && !containerIds.has(node.parentId)) {
        throw new Error(`${context}: parentId "${node.parentId}" does not reference an existing container node`);
      }
    });
  }

  const legacyPlateIds = new Set<string>();
  const legacyBlockIds = new Set<string>();
  if (hasLegacy) {
    ((imported as Record<string, unknown>).plates as unknown[]).forEach((plate, index) => {
      const context = `Invalid plate at index ${index}`;
      if (!isRecord(plate)) {
        throw new Error(`${context}: plate must be an object`);
      }

      if (typeof plate.id !== 'string') {
        throw new Error(`${context}: id must be a string`);
      }
      if (typeof plate.name !== 'string') {
        throw new Error(`${context}: name must be a string`);
      }
      if (!isValidPlateType(plate.type)) {
        throw new Error(`${context}: type must be one of global, edge, region, zone, or subnet`);
      }
      validatePosition(plate.position, context);
      validateSize(plate.size, context);

      legacyPlateIds.add(plate.id);
    });

    ((imported as Record<string, unknown>).blocks as unknown[]).forEach((block, index) => {
      const context = `Invalid block at index ${index}`;
      if (!isRecord(block)) {
        throw new Error(`${context}: block must be an object`);
      }

      if (typeof block.id !== 'string') {
        throw new Error(`${context}: id must be a string`);
      }
      if (typeof block.name !== 'string') {
        throw new Error(`${context}: name must be a string`);
      }
      if (!isValidBlockCategory(block.category)) {
        throw new Error(
          `${context}: category must be one of network, security, edge, compute, data, messaging, operations`
        );
      }
      if (typeof block.placementId !== 'string') {
        throw new Error(`${context}: placementId must be a string`);
      }
      validatePosition(block.position, context);

      if (!legacyPlateIds.has(block.placementId)) {
        throw new Error(
          `${context}: placementId "${block.placementId}" does not reference an existing container`
        );
      }

      legacyBlockIds.add(block.id);
    });
  }

  const externalActorIds = new Set<string>();
  if (imported.externalActors === undefined) {
    externalActorIds.add('ext-internet');
  } else {
    if (!Array.isArray(imported.externalActors)) {
      throw new Error('Invalid architecture format: externalActors must be an array');
    }

    imported.externalActors.forEach((actor, index) => {
      const context = `Invalid external actor at index ${index}`;
      if (!isRecord(actor)) {
        throw new Error(`${context}: external actor must be an object`);
      }

      if (typeof actor.id !== 'string') {
        throw new Error(`${context}: id must be a string`);
      }

      if (actor.position !== undefined) {
        validatePosition(actor.position, context);
      }

      externalActorIds.add(actor.id);
    });
  }

  const validConnectionEndpointIds = new Set<string>([
    ...containerIds,
    ...resourceIds,
    ...legacyPlateIds,
    ...legacyBlockIds,
    ...externalActorIds,
  ]);

  const connections = imported.connections ?? [];
  connections.forEach((connection, index) => {
    const context = `Invalid connection at index ${index}`;
    if (!isRecord(connection)) {
      throw new Error(`${context}: connection must be an object`);
    }

    if (typeof connection.id !== 'string') {
      throw new Error(`${context}: id must be a string`);
    }
    const isV4Connection = typeof connection.from === 'string' && typeof connection.to === 'string';
    const isV3Connection = typeof connection.sourceId === 'string' && typeof connection.targetId === 'string';

    if (!isV4Connection && !isV3Connection) {
      throw new Error(`${context}: connection must have from/to (v4) or sourceId/targetId (v3)`);
    }

    if (isV4Connection) {
      const fromEndpointId = connection.from as string;
      const toEndpointId = connection.to as string;
      const endpointIds = new Set<string>();
      if (Array.isArray(imported.endpoints)) {
        imported.endpoints.forEach((endpoint) => {
          if (isRecord(endpoint) && typeof endpoint.id === 'string') {
            endpointIds.add(endpoint.id);
          }
        });
      }

      if (endpointIds.size > 0) {
        if (!endpointIds.has(fromEndpointId)) {
          throw new Error(`${context}: from endpoint "${fromEndpointId}" does not exist`);
        }
        if (!endpointIds.has(toEndpointId)) {
          throw new Error(`${context}: to endpoint "${toEndpointId}" does not exist`);
        }
      }
      // When no explicit endpoints array, validate nodeIds embedded in endpoint IDs
      if (endpointIds.size === 0) {
        const fromParsed = parseEndpointId(fromEndpointId);
        const toParsed = parseEndpointId(toEndpointId);
        if (fromParsed && !validConnectionEndpointIds.has(fromParsed.nodeId)) {
          throw new Error(
            `${context}: sourceId "${fromParsed.nodeId}" does not reference an existing block, plate, or external actor`
          );
        }
        if (toParsed && !validConnectionEndpointIds.has(toParsed.nodeId)) {
          throw new Error(
            `${context}: targetId "${toParsed.nodeId}" does not reference an existing block, plate, or external actor`
          );
        }
      }
      return;
    }

    const sourceId = connection.sourceId as string;
    const targetId = connection.targetId as string;

    if (!validConnectionEndpointIds.has(sourceId)) {
      throw new Error(
        `${context}: sourceId "${sourceId}" does not reference an existing block, plate, or external actor`
      );
    }

    if (!validConnectionEndpointIds.has(targetId)) {
      throw new Error(
        `${context}: targetId "${targetId}" does not reference an existing block, plate, or external actor`
      );
    }
  });

  return { valid: true };
};

const validateImportData = (
  imported: unknown,
  jsonLength: number,
): { valid: true } => {
  if (jsonLength > MAX_IMPORT_SIZE_BYTES) {
    throw new Error('Import exceeds 5MB limit');
  }

  return validateArchitectureShape(imported);
};

type PersistenceSlice = Pick<
  ArchitectureState,
  | 'saveToStorage'
  | 'loadFromStorage'
  | 'resetWorkspace'
  | 'renameWorkspace'
  | 'importArchitecture'
  | 'exportArchitecture'
  | 'loadFromTemplate'
  | 'replaceArchitecture'
>;

export const createPersistenceSlice: ArchitectureSlice<PersistenceSlice> = (
  set,
  get
) => ({
  saveToStorage: () => {
    const state = get();
    const updated = upsertCurrentWorkspace(state.workspaces, state.workspace);

    const success = saveWorkspaces(updated);
    if (success) {
      saveActiveWorkspaceId(state.workspace.id);
      set({ workspaces: updated });
    }
    return success;
  },

  loadFromStorage: () => {
    const workspaces = loadWorkspaces();

    if (workspaces.length === 0) {
      return;
    }

    const activeId = loadActiveWorkspaceId();
    const active = workspaces.find((ws) => ws.id === activeId) ?? workspaces[0];

    useUIStore.getState().clearDiffState();

    set({
      workspace: active,
      workspaces,
      ...resetTransientState(),
    });
  },

  resetWorkspace: () => {
    const state = get();
    const now = new Date().toISOString();
    const blank = createDefaultWorkspace();
    const cleared: Workspace = {
      ...state.workspace,
      architecture: blank.architecture,
      updatedAt: now,
    };

    const updatedList = upsertCurrentWorkspace(state.workspaces, cleared);
    if (saveWorkspaces(updatedList)) {
      saveActiveWorkspaceId(cleared.id);
    }

    useUIStore.getState().clearDiffState();

    set({
      workspace: cleared,
      workspaces: updatedList,
      ...resetTransientState(),
    });
  },

  renameWorkspace: (name) => {
    const state = get();
    const allWorkspaces = upsertCurrentWorkspace(state.workspaces, state.workspace);
    const uniqueName = deduplicateWorkspaceName(name, allWorkspaces, state.workspace.id);
    const renamed: Workspace = {
      ...state.workspace,
      name: uniqueName,
      architecture: touchModel(state.workspace.architecture),
      updatedAt: new Date().toISOString(),
    };

    const updatedList = upsertCurrentWorkspace(state.workspaces, renamed);
    saveWorkspaces(updatedList);

    set({
      workspace: renamed,
      workspaces: updatedList,
    });
  },

  importArchitecture: (json) => {
    try {
      const importedRaw = JSON.parse(json) as unknown;
      validateImportData(importedRaw, json.length);
      const imported = importedRaw as Record<string, unknown>;

      const now = new Date().toISOString();

      // Handle legacy (plates+blocks) or new (nodes) format
      let nodes: (ContainerNode | LeafNode)[];
      const importedAny = imported as Record<string, unknown>;
      if (Array.isArray(importedAny.nodes)) {
        nodes = importedAny.nodes as (ContainerNode | LeafNode)[];
      } else if (Array.isArray(importedAny.plates) && Array.isArray(importedAny.blocks)) {
        // Migrate legacy format
        const containerNodes = (importedAny.plates as Record<string, unknown>[]).map((plate): ContainerNode => ({
          id: plate.id as string,
          name: plate.name as string,
          kind: 'container',
          layer: plate.type as ContainerNode['layer'],
          resourceType: ((plate.type as string) === 'region' ? 'virtual_network' : plate.type === 'subnet' ? 'subnet' : 'virtual_network') as ContainerNode['resourceType'],
          category: 'network',
          provider: 'azure',
          parentId: (plate.parentId as string | null | undefined) ?? null,
          position: plate.position as ContainerNode['position'],
          size: plate.size as ContainerNode['size'],
          metadata: (plate.metadata as Record<string, unknown>) ?? {},
          ...(typeof plate.profileId === 'string' ? { profileId: plate.profileId } : {}),
        }));
        const leafNodes = (importedAny.blocks as Record<string, unknown>[]).map((block): LeafNode => ({
          id: block.id as string,
          name: block.name as string,
          kind: 'resource',
          layer: 'resource',
          resourceType: (block.subtype as string | undefined) ?? (block.category as string),
          category: block.category as ResourceCategory,
          provider: (block.provider as LeafNode['provider'] | undefined) ?? 'azure',
          parentId: block.placementId as string,
          position: block.position as LeafNode['position'],
          metadata: (block.metadata as Record<string, unknown>) ?? {},
          ...(typeof block.subtype === 'string' ? { subtype: block.subtype } : {}),
          ...((block.config && typeof block.config === 'object') ? { config: block.config as Record<string, unknown> } : {}),
        }));
        nodes = [...containerNodes, ...leafNodes];
      } else {
        nodes = [];
      }

      const endpoints = nodes.flatMap((node) => generateEndpointsForNode(node.id));
      const rawConnections = ((imported.connections as unknown[]) ?? [])
        .filter((connection): connection is Record<string, unknown> => isRecord(connection));
      const connections: ArchitectureModel['connections'] = rawConnections
        .map((connection) => {
          if (typeof connection.from === 'string' && typeof connection.to === 'string') {
            return {
              id: typeof connection.id === 'string' ? connection.id : generateId('conn'),
              from: connection.from,
              to: connection.to,
              metadata:
                isRecord(connection.metadata)
                  ? connection.metadata
                  : {},
            };
          }

          if (typeof connection.sourceId === 'string' && typeof connection.targetId === 'string') {
            const semantic =
              typeof connection.type === 'string'
                ? connectionTypeToSemantic(connection.type)
                : 'data';
            return {
              id: typeof connection.id === 'string' ? connection.id : generateId('conn'),
              from: endpointId(connection.sourceId, 'output', semantic),
              to: endpointId(connection.targetId, 'input', semantic),
              metadata: {},
            };
          }

          return null;
        })
        .filter((connection): connection is ArchitectureModel['connections'][number] => connection !== null);

      const normalized: ArchitectureModel = {
        id: (imported.id as string) || generateId('arch'),
        name: (imported.name as string) || 'Imported Architecture',
        version: (imported.version as string) || '1',
        nodes,
        endpoints,
        connections,
        externalActors:
          (imported.externalActors as ArchitectureModel['externalActors'])?.map((actor) => ({
            ...actor,
            position: actor.position ?? { ...DEFAULT_EXTERNAL_ACTOR_POSITION },
          })) ?? [
            {
              id: 'ext-internet',
              name: 'Internet',
              type: 'internet',
              position: { ...DEFAULT_EXTERNAL_ACTOR_POSITION },
            },
          ],
        createdAt: (imported.createdAt as string) || now,
        updatedAt: now,
      };

      const newWorkspace: Workspace = {
        id: generateId('ws'),
        name: normalized.name,
        architecture: normalized,
        createdAt: now,
        updatedAt: now,
      };

      const state = get();
      const updatedList = upsertCurrentWorkspace(state.workspaces, state.workspace);
      updatedList.push(newWorkspace);

      if (saveWorkspaces(updatedList)) {
        saveActiveWorkspaceId(newWorkspace.id);
      }

      useUIStore.getState().clearDiffState();

      set({
        workspace: newWorkspace,
        workspaces: updatedList,
        ...resetTransientState(),
      });

      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown import error';
      logger.error('Failed to import architecture:', error);
      return message;
    }
  },

  exportArchitecture: () => {
    const state = get();
    return JSON.stringify(state.workspace.architecture, null, 2);
  },

  loadFromTemplate: (template) => {
    const now = new Date().toISOString();
    const newWorkspace: Workspace = {
      id: generateId('ws'),
      name: template.name,
      architecture: {
        ...JSON.parse(JSON.stringify(template.architecture)),
        id: generateId('arch'),
        createdAt: now,
        updatedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    const state = get();
    const updatedList = upsertCurrentWorkspace(state.workspaces, state.workspace);
    updatedList.push(newWorkspace);

    if (saveWorkspaces(updatedList)) {
      saveActiveWorkspaceId(newWorkspace.id);
    }

    useUIStore.getState().clearDiffState();

    set({
      workspace: newWorkspace,
      workspaces: updatedList,
      ...resetTransientState(),
    });
  },

  replaceArchitecture: (snapshot: ArchitectureSnapshot) => {
    validateArchitectureShape(snapshot);

    const state = get();
    const now = new Date().toISOString();
    const newArch: ArchitectureModel = {
      ...JSON.parse(JSON.stringify(snapshot)),
      id: state.workspace.architecture.id,
      createdAt: state.workspace.architecture.createdAt,
      updatedAt: now,
    };

    set({
      ...withHistory(state, newArch),
    });
  },
});
