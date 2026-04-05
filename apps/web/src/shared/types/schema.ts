import type {
  ArchitectureModel,
  ContainerBlock,
  Endpoint,
  ExternalActor,
  LegacyConnection,
  ResourceBlock,
  ContainerLayer,
  Position,
  ResourceCategory,
  Workspace,
} from './index';
import logger from '../utils/logger';
import {
  buildContainerBlockSizeFromProfileId,
  inferLegacyContainerBlockProfileId,
  isContainerBlockProfileId,
  DEFAULT_CONTAINER_BLOCK_PROFILE,
} from './index';
import {
  connectionTypeToSemantic,
  endpointId,
  generateEndpointsForBlock,
  SCHEMA_VERSION,
} from '@cloudblocks/schema';

const DEFAULT_EXTERNAL_ACTOR_POSITION = { x: 4, y: 0, z: 10 };

/**
 * Migrate ExternalActor[] entries into ResourceBlock nodes.
 * Preserves original actor IDs so existing connection endpoints remain valid.
 * Idempotent: skips actors whose ID already exists in the nodes array.
 *
 * @param externalActors - legacy ExternalActor array from persisted data
 * @param existingNodeIds - Set of node IDs already in the architecture
 * @param provider - workspace provider to assign to migrated blocks
 * @returns array of ResourceBlock nodes created from external actors
 */
export function migrateExternalActorsToBlocks(
  externalActors: ExternalActor[],
  existingNodeIds: ReadonlySet<string>,
  provider: 'azure' | 'aws' | 'gcp',
): ResourceBlock[] {
  return externalActors
    .filter((actor) => !existingNodeIds.has(actor.id))
    .map(
      (actor): ResourceBlock => ({
        id: actor.id,
        name: actor.name,
        kind: 'resource',
        layer: 'resource',
        resourceType: actor.type,
        category: 'delivery',
        provider,
        parentId: null,
        position: actor.position ?? { ...DEFAULT_EXTERNAL_ACTOR_POSITION },
        metadata: {},
        roles: ['external'],
      }),
    );
}
/**
 * SCHEMA_VERSION: Controls the serialization/storage format.
 * Canonical source: packages/schema/src/index.ts
 * Bump when the shape of SerializedData or Workspace changes.
 * Used to detect incompatible localStorage data and trigger migrations.
 *
 * This is separate from ArchitectureModel.version, which tracks
 * the user's architecture revision (user-facing, incremented on save/export).
 *
 * v2.0.0 — Clean start: CU-based dimensions, 6-layer hierarchy,
 *          10 categories, aggregation, roles. No v1.x migration.
 * v4.0.0 — Endpoint-based connections (M22)
 * v4.1.0 — External actor migration to block nodes
 */
export { SCHEMA_VERSION };

/**
 * v1.x schema versions that are explicitly rejected (clean start, no migration).
 * See CLOUDBLOCKS_SPEC_V2.md §16.
 */
const LEGACY_VERSIONS = ['0.1.0', '0.2.0'];

const SUPPORTED_VERSIONS = [SCHEMA_VERSION, '4.0.0', '3.0.0', '2.0.0'];

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

/**
 * Maps stale subtype/resourceType keys to their canonical equivalents.
 * Applied during deserialization to migrate persisted workspaces.
 * Icon file paths (e.g. /gcp-icons/pub-sub.svg) are NOT affected — only map keys.
 */
const SUBTYPE_ALIASES: Record<string, string> = {
  'pub-sub': 'pubsub',
};

interface LegacyPlate {
  id: string;
  name: string;
  type: ContainerLayer;
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
        metadata: (isRecord(connection.metadata)
          ? { ...connection.metadata, type: connection.type }
          : { type: connection.type }) as Record<string, unknown>,
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
  // Materialize externalActors into nodes and strip the legacy field.
  // This ensures saved JSON is self-contained: external actors survive
  // a save→load roundtrip as regular block nodes without needing the
  // externalActors key on reload.  Runtime still keeps externalActors
  // in memory for backward compat until #1536 removes all actor paths.
  const normalized = workspaces.map((ws) => {
    if (!ws.architecture) return ws;
    const arch = ws.architecture;
    const hasActors =
      'externalActors' in arch &&
      Array.isArray(arch.externalActors) &&
      arch.externalActors.length > 0;
    if (!hasActors) {
      // Still strip the key if it exists (e.g. empty array)
      if ('externalActors' in arch) {
        const { externalActors: _ea, ...archWithout } = arch;
        return { ...ws, architecture: archWithout as ArchitectureModel };
      }
      return ws;
    }
    // Materialize actors into nodes (idempotent — skips already-present IDs)
    const existingNodeIds = new Set(arch.nodes.map((n) => n.id));
    const provider = ws.provider ?? 'azure';
    const materialized = migrateExternalActorsToBlocks(
      arch.externalActors!,
      existingNodeIds,
      provider,
    );
    const mergedNodes = materialized.length > 0 ? [...arch.nodes, ...materialized] : arch.nodes;
    // Generate endpoints for newly-materialized blocks
    const existingEpBlockIds = new Set(arch.endpoints.map((ep) => ep.blockId));
    const newEndpoints = materialized
      .filter((b) => !existingEpBlockIds.has(b.id))
      .flatMap((b) => generateEndpointsForBlock(b.id));
    const mergedEndpoints =
      newEndpoints.length > 0 ? [...arch.endpoints, ...newEndpoints] : arch.endpoints;
    const { externalActors: _ea, ...archWithout } = arch;
    return {
      ...ws,
      architecture: {
        ...archWithout,
        nodes: mergedNodes,
        endpoints: mergedEndpoints,
      } as ArchitectureModel,
    };
  });
  const data: SerializedData = {
    schemaVersion: SCHEMA_VERSION,
    workspaces: normalized,
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

      const containerNodes: ContainerBlock[] = legacyPlates.map((container) => ({
        id: container.id as string,
        name: container.name as string,
        kind: 'container' as const,
        layer: container.type as ContainerBlock['layer'],
        resourceType: ((container.type as string) === 'region'
          ? 'virtual_network'
          : (container.type as string) === 'subnet'
            ? 'subnet'
            : 'virtual_network') as ContainerBlock['resourceType'],
        category: 'network' as const,
        provider: 'azure' as const,
        parentId: (container.parentId as string | null) ?? null,
        position: container.position as ContainerBlock['position'],
        frame: container.size as ContainerBlock['frame'],
        metadata: (container.metadata as Record<string, unknown>) ?? {},
        ...(container.profileId ? { profileId: container.profileId as string } : {}),
      }));

      const leafNodes: ResourceBlock[] = (
        legacyBlocks as unknown as Array<Record<string, unknown>>
      ).map((block) => ({
        id: block.id as string,
        name: block.name as string,
        kind: 'resource' as const,
        layer: 'resource' as const,
        resourceType: (block.subtype as string | undefined) ?? (block.category as string),
        category: remapCategory(block.category as string),
        provider: (block.provider as ResourceBlock['provider'] | undefined) ?? 'azure',
        parentId: block.placementId as string,
        position: block.position as ResourceBlock['position'],
        metadata: (block.metadata as Record<string, unknown>) ?? {},
        ...(block.subtype ? { subtype: block.subtype as string } : {}),
        ...(block.config ? { config: block.config as Record<string, unknown> } : {}),
        ...(block.aggregation
          ? { aggregation: block.aggregation as ResourceBlock['aggregation'] }
          : {}),
        ...(block.roles ? { roles: block.roles as ResourceBlock['roles'] } : {}),
      }));

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

        // Normalize stale subtype/resourceType aliases (e.g. pub-sub → pubsub)
        if (typeof node.resourceType === 'string' && node.resourceType in SUBTYPE_ALIASES) {
          node.resourceType = SUBTYPE_ALIASES[node.resourceType];
        }
        if (typeof node.subtype === 'string' && node.subtype in SUBTYPE_ALIASES) {
          node.subtype = SUBTYPE_ALIASES[node.subtype];
        }

        const sizeOrFrame = isRecord(node.frame)
          ? node.frame
          : isRecord(node.size)
            ? node.size
            : null;

        if (node.kind === 'container' && sizeOrFrame && !node.profileId) {
          const layer = typeof node.layer === 'string' ? node.layer : 'region';
          const inferredProfileId = inferLegacyContainerBlockProfileId({
            type: layer as ContainerLayer,
            size: {
              width: Number(sizeOrFrame.width),
              depth: Number(sizeOrFrame.depth),
            },
          });
          node.profileId = inferredProfileId;
          node.frame = buildContainerBlockSizeFromProfileId(inferredProfileId);
          delete node.size;
        }

        // Ensure every container has a valid frame — handles the case where
        // profileId exists but frame was lost or stored under legacy 'size' key
        if (node.kind === 'container' && !isRecord(node.frame)) {
          const layer = typeof node.layer === 'string' ? (node.layer as ContainerLayer) : 'region';
          const pid =
            typeof node.profileId === 'string' && isContainerBlockProfileId(node.profileId)
              ? node.profileId
              : (DEFAULT_CONTAINER_BLOCK_PROFILE[layer] ?? DEFAULT_CONTAINER_BLOCK_PROFILE.region);
          node.profileId = pid;
          node.frame = buildContainerBlockSizeFromProfileId(pid);
          delete node.size;
        }
      }

      // ── Migrate externalActors → block nodes (v3→v4 unification) ──────
      // Runs after plates→nodes and category remap, before endpoint generation.
      // Preserves actor IDs as block IDs so existing connection endpoints stay valid.
      if (Array.isArray(architectureUnknown.externalActors)) {
        const existingNodeIds = new Set<string>(
          (architectureUnknown.nodes as Array<Record<string, unknown>>)
            .filter(isRecord)
            .map((n) => n.id as string)
            .filter((id): id is string => typeof id === 'string'),
        );
        const wsProvider = (ws.provider as 'azure' | 'aws' | 'gcp') ?? 'azure';
        const migratedBlocks = migrateExternalActorsToBlocks(
          architectureUnknown.externalActors as ExternalActor[],
          existingNodeIds,
          wsProvider,
        );
        if (migratedBlocks.length > 0) {
          (architectureUnknown.nodes as unknown[]).push(...migratedBlocks);
        }
      }

      const nodeIds = architectureUnknown.nodes
        .filter(isRecord)
        .map((node) => node.id)
        .filter((nodeId): nodeId is string => typeof nodeId === 'string');

      if (!isEndpointArray(architectureUnknown.endpoints)) {
        architectureUnknown.endpoints = nodeIds.flatMap((nodeId) =>
          generateEndpointsForBlock(nodeId),
        );
      } else {
        // When endpoints array already exists, generate endpoints for any
        // newly-migrated blocks whose IDs aren't already covered
        const existingEndpointBlockIds = new Set<string>(
          (architectureUnknown.endpoints as unknown as Array<Record<string, unknown>>)
            .filter(isRecord)
            .map((ep) => (ep.blockId as string) ?? (ep.nodeId as string))
            .filter((bid): bid is string => typeof bid === 'string'),
        );
        for (const nid of nodeIds) {
          if (!existingEndpointBlockIds.has(nid)) {
            (architectureUnknown.endpoints as unknown[]).push(...generateEndpointsForBlock(nid));
          }
        }
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
    nodes: [
      {
        id: 'ext-browser',
        name: 'Client',
        kind: 'resource',
        layer: 'resource',
        resourceType: 'browser',
        category: 'delivery',
        provider: 'azure',
        parentId: null,
        roles: ['external'],
        position: { x: 4, y: 0, z: 10 },
        metadata: {},
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
        roles: ['external'],
        position: { x: 7, y: 0, z: 10 },
        metadata: {},
      },
    ],
    endpoints: [
      ...generateEndpointsForBlock('ext-browser'),
      ...generateEndpointsForBlock('ext-internet'),
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
      { id: 'ext-browser', name: 'Client', type: 'browser', position: { x: 4, y: 0, z: 10 } },
      { id: 'ext-internet', name: 'Internet', type: 'internet', position: { x: 7, y: 0, z: 10 } },
    ],
    createdAt: now,
    updatedAt: now,
  };
}
