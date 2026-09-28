import type { Workspace } from '../../../shared/types/index';
import logger from '../../../shared/utils/logger';
import type { ArchitectureModel, ResourceCategory } from '@cloudblocks/schema';
import { getAllowedParents, isExternalResourceType, parseEndpointId } from '@cloudblocks/schema';
import { ingestArchitecture, type IngestionSource } from '../../ingestion/pipeline';
import {
  saveWorkspaces,
  loadWorkspaces,
  saveActiveWorkspaceId,
  loadActiveWorkspaceId,
} from '../../../shared/utils/storage';
import { generateId } from '../../../shared/utils/id';
import { remapSubtype, remapName, getContainerLabel } from '../../../shared/utils/providerMapping';
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
const DEFAULT_EXTERNAL_ACTOR_POSITION = { x: 4, y: 0, z: 10 };
type PlateLayerType = 'global' | 'edge' | 'region' | 'zone' | 'subnet';

const VALID_PLATE_TYPES: PlateLayerType[] = ['global', 'edge', 'region', 'zone', 'subnet'];
const VALID_BLOCK_CATEGORIES: ResourceCategory[] = [
  'network',
  'security',
  'delivery',
  'compute',
  'data',
  'messaging',
  'identity',
  'operations',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isValidBlockKind = (value: unknown): value is 'container' | 'resource' =>
  value === 'container' || value === 'resource';
const isValidContainerLayer = (value: unknown): value is PlateLayerType =>
  typeof value === 'string' && VALID_PLATE_TYPES.includes(value as PlateLayerType);

const isValidBlockCategory = (value: unknown): value is ResourceCategory =>
  typeof value === 'string' && VALID_BLOCK_CATEGORIES.includes(value as ResourceCategory);

const validatePosition = (value: unknown, context: string): void => {
  if (!isRecord(value)) {
    throw new Error(`${context}.position must be an object with x, y, z numbers`);
  }

  if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y) || !isFiniteNumber(value.z)) {
    throw new Error(`${context}.position must contain numeric x, y, z values`);
  }
};

const validateSize = (value: unknown, context: string, field: 'size' | 'frame' = 'size'): void => {
  if (!isRecord(value)) {
    throw new Error(`${context}.${field} must be an object with width, height, depth numbers`);
  }

  if (
    !isFiniteNumber(value.width) ||
    !isFiniteNumber(value.height) ||
    !isFiniteNumber(value.depth)
  ) {
    throw new Error(`${context}.${field} must contain numeric width, height, depth values`);
  }
};

export const validateArchitectureShape = (imported: unknown): { valid: true } => {
  if (!isRecord(imported)) {
    throw new Error('Invalid architecture format: root must be an object');
  }

  const hasNodes = Array.isArray(imported.nodes);
  const hasLegacy = Array.isArray(imported.plates) && Array.isArray(imported.blocks);
  if (!hasNodes && !hasLegacy) {
    throw new Error('Invalid architecture format: expected nodes[] or legacy plates[] + blocks[]');
  }

  if (imported.connections !== undefined && !Array.isArray(imported.connections)) {
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
      if (!isValidBlockKind(node.kind)) {
        throw new Error(`${context}: kind must be "container" or "resource"`);
      }
      validatePosition(node.position, context);

      if (node.kind === 'container') {
        if (!isValidContainerLayer(node.layer)) {
          throw new Error(`${context}: layer must be one of global, edge, region, zone, or subnet`);
        }
        const frame = node.frame ?? node.size;
        validateSize(frame, context, node.frame ? 'frame' : 'size');
        if (
          node.parentId !== null &&
          node.parentId !== undefined &&
          typeof node.parentId !== 'string'
        ) {
          throw new Error(`${context}: parentId must be a string or null`);
        }
        containerIds.add(node.id);
        return;
      }

      if (!isValidBlockCategory(node.category)) {
        throw new Error(
          `${context}: category must be one of network, security, delivery, compute, data, messaging, identity, operations`,
        );
      }
      if (typeof node.parentId !== 'string' && node.parentId !== null) {
        throw new Error(`${context}: resource node parentId must be a string or null`);
      }
      if (
        node.parentId === null &&
        (typeof node.resourceType !== 'string' ||
          (!isExternalResourceType(node.resourceType) &&
            !getAllowedParents(node.resourceType)?.includes(null)))
      ) {
        throw new Error(`${context}: non-external resource node parentId must be a string`);
      }
      resourceIds.add(node.id);
    });

    nodes.forEach((node, index) => {
      const context = `Invalid node at index ${index}`;
      if (!isRecord(node)) {
        return;
      }

      if (
        node.kind === 'container' &&
        typeof node.parentId === 'string' &&
        !containerIds.has(node.parentId)
      ) {
        throw new Error(
          `${context}: parentId "${node.parentId}" does not reference an existing container node`,
        );
      }

      if (
        node.kind === 'resource' &&
        typeof node.parentId === 'string' &&
        !containerIds.has(node.parentId)
      ) {
        throw new Error(
          `${context}: parentId "${node.parentId}" does not reference an existing container node`,
        );
      }
    });
  }

  const legacyPlateIds = new Set<string>();
  const legacyBlockIds = new Set<string>();
  if (hasLegacy) {
    ((imported as Record<string, unknown>).plates as unknown[]).forEach((container, index) => {
      const context = `Invalid container at index ${index}`;
      if (!isRecord(container)) {
        throw new Error(`${context}: container must be an object`);
      }

      if (typeof container.id !== 'string') {
        throw new Error(`${context}: id must be a string`);
      }
      if (typeof container.name !== 'string') {
        throw new Error(`${context}: name must be a string`);
      }
      if (!isValidContainerLayer(container.type)) {
        throw new Error(`${context}: type must be one of global, edge, region, zone, or subnet`);
      }
      validatePosition(container.position, context);
      validateSize(container.size, context);

      legacyPlateIds.add(container.id);
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
          `${context}: category must be one of network, security, delivery, compute, data, messaging, identity, operations`,
        );
      }
      if (typeof block.placementId !== 'string') {
        throw new Error(`${context}: placementId must be a string`);
      }
      validatePosition(block.position, context);

      if (!legacyPlateIds.has(block.placementId)) {
        throw new Error(
          `${context}: placementId "${block.placementId}" does not reference an existing container`,
        );
      }

      legacyBlockIds.add(block.id);
    });
  }

  const externalActorIds = new Set<string>();
  if (imported.externalActors === undefined) {
    externalActorIds.add('ext-browser');
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
    const isV3Connection =
      typeof connection.sourceId === 'string' && typeof connection.targetId === 'string';

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
        if (fromParsed && !validConnectionEndpointIds.has(fromParsed.blockId)) {
          throw new Error(
            `${context}: sourceId "${fromParsed.blockId}" does not reference an existing block, container, or external actor`,
          );
        }
        if (toParsed && !validConnectionEndpointIds.has(toParsed.blockId)) {
          throw new Error(
            `${context}: targetId "${toParsed.blockId}" does not reference an existing block, container, or external actor`,
          );
        }
      }
      return;
    }

    const sourceId = connection.sourceId as string;
    const targetId = connection.targetId as string;

    if (!validConnectionEndpointIds.has(sourceId)) {
      throw new Error(
        `${context}: sourceId "${sourceId}" does not reference an existing block, container, or external actor`,
      );
    }

    if (!validConnectionEndpointIds.has(targetId)) {
      throw new Error(
        `${context}: targetId "${targetId}" does not reference an existing block, container, or external actor`,
      );
    }
  });

  return { valid: true };
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

export const createPersistenceSlice: ArchitectureSlice<PersistenceSlice> = (set, get) => ({
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

    // Migration: ensure every workspace has a provider (legacy data may lack it)
    for (const ws of workspaces) {
      if (!ws.provider) {
        (ws as Workspace).provider = 'azure';
      }
    }

    const activeId = loadActiveWorkspaceId();
    const active = workspaces.find((ws) => ws.id === activeId) ?? workspaces[0];

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

  importArchitecture: (json, provider) => {
    try {
      if (json.length > MAX_IMPORT_SIZE_BYTES) {
        return 'Import exceeds 5MB limit';
      }

      const importedRaw = JSON.parse(json) as unknown;
      const now = new Date().toISOString();

      const ingested = ingestArchitecture(importedRaw, {
        source: 'file-import',
        provider,
        name: 'Imported Architecture',
        now,
        materializeExternalActors: true,
        regenerateEndpoints: true,
        validateShape: validateArchitectureShape,
      });

      if (!ingested.ok) {
        const message = ingested.issues[0].message;
        logger.error('Failed to import architecture:', message);
        return message;
      }

      const imported = importedRaw as Record<string, unknown>;
      const normalized: ArchitectureModel = {
        ...ingested.architecture,
        externalActors: (imported.externalActors as ArchitectureModel['externalActors'])?.map(
          (actor) => ({
            ...actor,
            position: actor.position ?? { ...DEFAULT_EXTERNAL_ACTOR_POSITION },
          }),
        ) ?? [
          { id: 'ext-browser', name: 'Client', type: 'browser', position: { x: -12, y: 0, z: 5 } },
          {
            id: 'ext-internet',
            name: 'Internet',
            type: 'internet',
            position: { x: -10, y: 0, z: 5 },
          },
        ],
      };

      // ─── Remap imported nodes to active provider ──────────────
      if (provider !== 'azure') {
        for (const node of normalized.nodes) {
          const azureSubtype = node.subtype ?? node.resourceType;
          node.provider = provider;
          if (node.kind === 'container') {
            const containerLabel = getContainerLabel(node.layer, provider);
            if (containerLabel && node.name === getContainerLabel(node.layer, 'azure')) {
              node.name = containerLabel;
            }
            if (node.subtype) {
              node.subtype = remapSubtype(node.subtype, provider);
            }
          } else {
            node.name = remapName(azureSubtype, node.name, provider);
            if (node.subtype) {
              node.subtype = remapSubtype(node.subtype, provider);
            }
          }
        }
      }

      const newWorkspace: Workspace = {
        id: generateId('ws'),
        name: normalized.name,
        provider,
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

  loadFromTemplate: (template, provider) => {
    const now = new Date().toISOString();

    const ingested = ingestArchitecture(JSON.parse(JSON.stringify(template.architecture)), {
      source: 'template',
      provider,
      name: template.name,
      now,
      regenerateEndpoints: true,
      validateShape: validateArchitectureShape,
    });

    if (!ingested.ok) {
      logger.error('Failed to load template:', ingested.issues[0].message);
      return;
    }

    const clonedArch = ingested.architecture;

    // ─── Remap nodes to active provider ──────────────────────
    if (provider !== 'azure') {
      for (const node of clonedArch.nodes ?? []) {
        const azureSubtype = node.subtype ?? node.resourceType;
        node.provider = provider;
        if (node.roles?.includes('external')) {
          continue;
        }
        if (node.kind === 'container') {
          // Remap container names (VNet → VPC, etc.)
          const containerLabel = getContainerLabel(node.layer, provider);
          if (containerLabel && node.name === getContainerLabel(node.layer, 'azure')) {
            node.name = containerLabel;
          }
          // Remap container subtype if present
          if (node.subtype) {
            node.subtype = remapSubtype(node.subtype, provider);
          }
        } else {
          // Remap resource block name, subtype
          node.name = remapName(azureSubtype, node.name, provider);
          if (node.subtype) {
            node.subtype = remapSubtype(node.subtype, provider);
          }
        }
      }
    }

    const newWorkspace: Workspace = {
      id: generateId('ws'),
      name: template.name,
      provider,
      architecture: {
        ...clonedArch,
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

    set({
      workspace: newWorkspace,
      workspaces: updatedList,
      ...resetTransientState(),
    });
  },

  replaceArchitecture: (snapshot, source: IngestionSource = 'learning-snapshot') => {
    const state = get();
    const provider = state.workspace.provider ?? 'azure';
    const now = new Date().toISOString();
    const cloned: unknown = isRecord(snapshot) ? JSON.parse(JSON.stringify(snapshot)) : snapshot;

    const ingested = ingestArchitecture(cloned, {
      source,
      provider,
      name: state.workspace.architecture.name,
      now,
      validateShape: validateArchitectureShape,
    });

    if (!ingested.ok) {
      throw new Error(ingested.issues[0].message);
    }

    const newArch: ArchitectureModel = {
      ...ingested.architecture,
      id: state.workspace.architecture.id,
      createdAt: state.workspace.architecture.createdAt,
      updatedAt: now,
    };

    set({
      ...withHistory(state, newArch),
    });
  },
});
