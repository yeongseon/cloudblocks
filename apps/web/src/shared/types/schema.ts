import type {
  ArchitectureModel,
  ContainerNode,
  Endpoint,
  LegacyConnection,
  LeafNode,
  PlateType,
  Position,
  ResourceCategory,
  Workspace,
} from './index';
import logger from '../utils/logger';
import { buildPlateSizeFromProfileId, inferLegacyPlateProfileId } from './index';
import {
  connectionTypeToSemantic,
  endpointId,
  generateEndpointsForNode,
} from '@cloudblocks/schema';

const DEFAULT_EXTERNAL_ACTOR_POSITION = { x: -3, y: 0, z: 5 };

/**
 * SCHEMA_VERSION: Controls the serialization/storage format.
 * Bump when the shape of SerializedData or Workspace changes.
 * Used to detect incompatible localStorage data and trigger migrations.
 *
 * This is separate from ArchitectureModel.version, which tracks
 * the user's architecture revision (user-facing, incremented on save/export).
 *
 * v2.0.0 — Clean start: CU-based dimensions, 6-layer hierarchy,
 *          10 categories, aggregation, roles. No v1.x migration.
 */
export const CURRENT_SCHEMA_VERSION = '4.0.0';
export const SCHEMA_VERSION = CURRENT_SCHEMA_VERSION;

/**
 * v1.x schema versions that are explicitly rejected (clean start, no migration).
 * See CLOUDBLOCKS_SPEC_V2.md §16.
 */
const LEGACY_VERSIONS = ['0.1.0', '0.2.0'];

const SUPPORTED_VERSIONS = [SCHEMA_VERSION, '3.0.0', '2.0.0'];

export type ArchitectureSnapshot = Omit<ArchitectureModel, 'id' | 'createdAt' | 'updatedAt'> & {
  endpoints: ArchitectureModel['endpoints'];
  externalActors?: ArchitectureModel['externalActors'];
};

/**
 * Maps old 10-category names (v2.0.0) to new 7-category names (v3.0.0).
 * Categories that already exist in the new system map to themselves.
 */
type LegacyBlockCategory =
  | ResourceCategory
  | 'edge'
  | 'database'
  | 'storage'
  | 'gateway'
  | 'function'
  | 'queue'
  | 'event'
  | 'analytics'
  | 'identity'
  | 'observability';

const LEGACY_CATEGORY_MAP: Record<LegacyBlockCategory, ResourceCategory> = {
  network: 'network',
  security: 'security',
  edge: 'delivery',
  delivery: 'delivery',
  compute: 'compute',
  data: 'data',
  messaging: 'messaging',
  identity: 'identity',
  operations: 'operations',
  database: 'data',
  storage: 'data',
  gateway: 'delivery',
  function: 'compute',
  queue: 'messaging',
  event: 'messaging',
  analytics: 'operations',
  observability: 'operations',
};

/**
 * Remap a potentially-legacy category string to the current 7-category system.
 * Returns the input unchanged if it's already a valid ResourceCategory.
 * Returns 'compute' as a safe fallback for completely unknown values.
 */
function remapCategory(raw: string): ResourceCategory {
  const mapped = LEGACY_CATEGORY_MAP[raw as LegacyBlockCategory];
  if (mapped) return mapped;
  logger.warn(`Unknown legacy category "${raw}", falling back to "compute".`);
  return 'compute';
}

interface LegacyPlate {
  id: string;
  name: string;
  type: PlateType;
  parentId?: string | null;
  position: Position;
  size: { width: number; height: number; depth: number };
  metadata?: Record<string, unknown>;
  profileId?: string;
}

interface LegacyBlock {
  id: string;
  name: string;
  category: ResourceCategory;
  placementId: string;
  position: Position;
  metadata?: Record<string, unknown>;
  provider?: 'azure' | 'aws' | 'gcp';
  subtype?: string;
  config?: Record<string, unknown>;
  aggregation?: { mode: 'single' | 'count'; count: number };
  roles?: Array<
    'primary' | 'secondary' | 'reader' | 'writer' | 'public' | 'private' | 'internal' | 'external'
  >;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isLegacyPlateArray = (value: unknown): value is LegacyPlate[] => Array.isArray(value);

const isLegacyBlockArray = (value: unknown): value is LegacyBlock[] => Array.isArray(value);

const isEndpointArray = (value: unknown): value is Endpoint[] => Array.isArray(value);

const isLegacyConnection = (value: unknown): value is LegacyConnection =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.sourceId === 'string' &&
  typeof value.targetId === 'string' &&
  typeof value.type === 'string';

const hasV4ConnectionShape = (value: unknown): value is ArchitectureModel['connections'][number] =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.from === 'string' &&
  typeof value.to === 'string';

function migrateConnectionsToV4(connections: unknown): ArchitectureModel['connections'] {
  if (!Array.isArray(connections)) {
    return [];
  }

  if (connections.every(hasV4ConnectionShape)) {
    return connections.map((connection) => ({
      id: connection.id,
      from: connection.from,
      to: connection.to,
      metadata: isRecord(connection.metadata) ? connection.metadata : {},
    }));
  }

  return connections
    .map((connection, index) => {
      if (!isLegacyConnection(connection)) {
        return null;
      }
      const semantic = connectionTypeToSemantic(connection.type);
      return {
        id: connection.id || `conn-${index}`,
        from: endpointId(connection.sourceId, 'output', semantic),
        to: endpointId(connection.targetId, 'input', semantic),
        metadata: isRecord(connection.metadata) ? connection.metadata : {},
      };
    })
    .filter(
      (connection): connection is ArchitectureModel['connections'][number] => connection !== null,
    );
}

export interface SerializedData {
  schemaVersion: string;
  workspaces: Workspace[];
}

/**
 * Create a serializable snapshot of workspaces.
 */
export function serialize(workspaces: Workspace[]): string {
  const data: SerializedData = {
    schemaVersion: SCHEMA_VERSION,
    workspaces,
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Parse serialized workspace data with schema version validation.
 */
export function deserialize(json: string): Workspace[] {
  const data: SerializedData = JSON.parse(json);

  if (!data.schemaVersion) {
    throw new Error('Missing schemaVersion in serialized data');
  }

  // Reject legacy v1.x workspaces (clean start — no migration)
  if (LEGACY_VERSIONS.includes(data.schemaVersion)) {
    throw new Error(
      `Incompatible workspace format: v${data.schemaVersion} is no longer supported. ` +
        'CloudBlocks v2.0 uses a new format. Please create a new workspace.',
    );
  }

  if (!SUPPORTED_VERSIONS.includes(data.schemaVersion)) {
    logger.warn(
      `Schema version mismatch: expected ${SCHEMA_VERSION}, got ${data.schemaVersion}. ` +
        'Data may need migration.',
    );
  }

  const workspaces = data.workspaces ?? [];

  for (const ws of workspaces) {
    const architectureUnknown = ws.architecture as unknown;
    if (!isRecord(architectureUnknown)) {
      continue;
    }

    const hasLegacyNodes = isLegacyPlateArray(architectureUnknown.plates);
    const hasUnifiedNodes = Array.isArray(architectureUnknown.nodes);
    if (hasLegacyNodes && !hasUnifiedNodes) {
      const legacyPlates = architectureUnknown.plates as Array<Record<string, unknown>>;
      const legacyBlocks = isLegacyBlockArray(architectureUnknown.blocks)
        ? architectureUnknown.blocks
        : [];

      const containerNodes: ContainerNode[] = legacyPlates.map((plate) => ({
        id: plate.id as string,
        name: plate.name as string,
        kind: 'container' as const,
        layer: plate.type as ContainerNode['layer'],
        resourceType: ((plate.type as string) === 'region'
          ? 'virtual_network'
          : (plate.type as string) === 'subnet'
            ? 'subnet'
            : 'virtual_network') as ContainerNode['resourceType'],
        category: 'network' as const,
        provider: 'azure' as const,
        parentId: (plate.parentId as string | null) ?? null,
        position: plate.position as ContainerNode['position'],
        size: plate.size as ContainerNode['size'],
        metadata: (plate.metadata as Record<string, unknown>) ?? {},
        ...(plate.profileId ? { profileId: plate.profileId as string } : {}),
      }));

      const leafNodes: LeafNode[] = (legacyBlocks as unknown as Array<Record<string, unknown>>).map(
        (block) => ({
          id: block.id as string,
          name: block.name as string,
          kind: 'resource' as const,
          layer: 'resource' as const,
          resourceType: (block.subtype as string | undefined) ?? (block.category as string),
          category: remapCategory(block.category as string),
          provider: (block.provider as LeafNode['provider'] | undefined) ?? 'azure',
          parentId: block.placementId as string,
          position: block.position as LeafNode['position'],
          metadata: (block.metadata as Record<string, unknown>) ?? {},
          ...(block.subtype ? { subtype: block.subtype as string } : {}),
          ...(block.config ? { config: block.config as Record<string, unknown> } : {}),
          ...(block.aggregation
            ? { aggregation: block.aggregation as LeafNode['aggregation'] }
            : {}),
          ...(block.roles ? { roles: block.roles as LeafNode['roles'] } : {}),
        }),
      );

      architectureUnknown.nodes = [...containerNodes, ...leafNodes];
      delete architectureUnknown.plates;
      delete architectureUnknown.blocks;
    }

    if (Array.isArray(architectureUnknown.nodes)) {
      for (const node of architectureUnknown.nodes) {
        if (!isRecord(node)) {
          continue;
        }

        // Remap legacy categories on all nodes (covers both freshly-migrated
        // and already-persisted nodes that have old category names)
        if (typeof node.category === 'string') {
          node.category = remapCategory(node.category as string);
        }

        if (node.kind === 'container' && isRecord(node.size) && !node.profileId) {
          const layer = typeof node.layer === 'string' ? node.layer : 'region';
          const inferredProfileId = inferLegacyPlateProfileId({
            type: layer as PlateType,
            size: {
              width: Number(node.size.width),
              depth: Number(node.size.depth),
            },
          });
          node.profileId = inferredProfileId;
          node.size = buildPlateSizeFromProfileId(inferredProfileId);
        }
      }

      const nodeIds = architectureUnknown.nodes
        .filter(isRecord)
        .map((node) => node.id)
        .filter((nodeId): nodeId is string => typeof nodeId === 'string');

      if (!isEndpointArray(architectureUnknown.endpoints)) {
        architectureUnknown.endpoints = nodeIds.flatMap((nodeId) =>
          generateEndpointsForNode(nodeId),
        );
      }

      architectureUnknown.connections = migrateConnectionsToV4(architectureUnknown.connections);
    }

    if (Array.isArray(architectureUnknown.externalActors)) {
      for (const actor of architectureUnknown.externalActors) {
        if (!isRecord(actor)) {
          continue;
        }
        const legacyActor = actor as typeof actor & { position?: Position };
        if (!legacyActor.position) {
          legacyActor.position = { ...DEFAULT_EXTERNAL_ACTOR_POSITION };
        }
      }
    }
  }

  return workspaces;
}

/**
 * Create a blank ArchitectureModel.
 */
export function createBlankArchitecture(id: string, name: string): ArchitectureModel {
  const now = new Date().toISOString();
  return {
    id,
    name,
    version: '1',
    nodes: [],
    endpoints: [
      ...generateEndpointsForNode('ext-browser'),
      ...generateEndpointsForNode('ext-internet'),
    ],
    connections: [
      {
        id: 'conn-browser-internet',
        from: endpointId('ext-browser', 'output', 'http'),
        to: endpointId('ext-internet', 'input', 'http'),
        metadata: {},
      },
    ],
    externalActors: [
      { id: 'ext-browser', name: 'Browser', type: 'browser', position: { x: -6, y: 0, z: 5 } },
      { id: 'ext-internet', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
    ],
    createdAt: now,
    updatedAt: now,
  };
}
