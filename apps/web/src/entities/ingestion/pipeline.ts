import type {
  ArchitectureModel,
  Block,
  ContainerBlock,
  ProviderType,
  ResourceBlock,
  ResourceCategory,
} from '@cloudblocks/schema';
import {
  CATEGORY_DEFAULT_RESOURCE_TYPE,
  connectionTypeToSemantic,
  endpointId,
  generateEndpointsForBlock,
} from '@cloudblocks/schema';
import { canonicalizeResourceNodes } from '../../shared/types/resourceIdentity';
import { migrateExternalActorsToBlocks } from '../../shared/types/schema';
import { validateGraphInvariants } from '../validation/graph';
import { generateId } from '../../shared/utils/id';

/**
 * Shared ingestion boundary for architectures that come from outside the editor.
 *
 * File import, workspace restore, GitHub pull, AI generation, templates and
 * learning snapshots previously each ran their own subset of migration and
 * validation, so the same malformed payload could be rejected on one path and
 * silently applied on another. Every external source runs these stages, in this
 * order, and the caller mutates state only on success:
 *
 *   canonical normalization → shape validation → model build → graph invariants
 *
 * Normalization runs first because the shape validator rejects a root resource
 * whose `resourceType` is a legacy alias — exactly the payloads the migration
 * exists to accept.
 */

export type IngestionSource =
  | 'file-import'
  | 'workspace-restore'
  | 'github-pull'
  | 'ai-generation'
  | 'template'
  | 'learning-snapshot';

export interface IngestionIssue {
  source: IngestionSource;
  message: string;
  blockId?: string;
}

export type IngestionResult =
  { ok: true; architecture: ArchitectureModel } | { ok: false; issues: IngestionIssue[] };

interface CanonicalizableRawNode {
  kind: string;
  resourceType: string;
  subtype?: string;
  provider?: ProviderType;
  category?: ResourceCategory;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function canonicalizeRawArchitecture(raw: unknown, provider: ProviderType): void {
  if (!isRecord(raw) || !Array.isArray(raw.nodes)) {
    return;
  }

  canonicalizeResourceNodes(
    raw.nodes.filter(isRecord) as unknown as CanonicalizableRawNode[],
    provider,
  );
}

function buildNodes(raw: Record<string, unknown>): Block[] {
  if (Array.isArray(raw.nodes)) {
    return (raw.nodes as Block[]).map((node) => {
      if (node.kind !== 'container') {
        return node;
      }

      const container = node as ContainerBlock & { size?: ContainerBlock['frame'] };
      return { ...container, frame: container.frame ?? container.size };
    });
  }

  if (!Array.isArray(raw.plates) || !Array.isArray(raw.blocks)) {
    return [];
  }

  const containerNodes = (raw.plates as Record<string, unknown>[]).map(
    (container): ContainerBlock => ({
      id: container.id as string,
      name: container.name as string,
      kind: 'container',
      layer: container.type as ContainerBlock['layer'],
      resourceType: ((container.type as string) === 'subnet'
        ? 'subnet'
        : 'virtual_network') as ContainerBlock['resourceType'],
      category: 'network',
      provider: 'azure',
      parentId: (container.parentId as string | null | undefined) ?? null,
      position: container.position as ContainerBlock['position'],
      frame: container.size as ContainerBlock['frame'],
      metadata: (container.metadata as Record<string, unknown>) ?? {},
      ...(typeof container.profileId === 'string' ? { profileId: container.profileId } : {}),
    }),
  );

  const leafNodes = (raw.blocks as Record<string, unknown>[]).map((block): ResourceBlock => ({
    id: block.id as string,
    name: block.name as string,
    kind: 'resource',
    layer: 'resource',
    resourceType:
      (block.subtype as string | undefined) ??
      CATEGORY_DEFAULT_RESOURCE_TYPE[block.category as ResourceCategory] ??
      (block.category as string),
    category: block.category as ResourceCategory,
    provider: (block.provider as ResourceBlock['provider'] | undefined) ?? 'azure',
    parentId: block.placementId as string,
    position: block.position as ResourceBlock['position'],
    metadata: (block.metadata as Record<string, unknown>) ?? {},
    ...(typeof block.subtype === 'string' ? { subtype: block.subtype } : {}),
    ...(block.config && typeof block.config === 'object'
      ? { config: block.config as Record<string, unknown> }
      : {}),
  }));

  return [...containerNodes, ...leafNodes];
}

function buildConnections(raw: Record<string, unknown>): ArchitectureModel['connections'] {
  const rawConnections = ((raw.connections as unknown[]) ?? []).filter(isRecord);

  return rawConnections
    .map((connection) => {
      if (typeof connection.from === 'string' && typeof connection.to === 'string') {
        return {
          id: typeof connection.id === 'string' ? connection.id : generateId('conn'),
          from: connection.from,
          to: connection.to,
          metadata: isRecord(connection.metadata) ? connection.metadata : {},
        };
      }

      if (typeof connection.sourceId === 'string' && typeof connection.targetId === 'string') {
        const semantic =
          typeof connection.type === 'string' ? connectionTypeToSemantic(connection.type) : 'data';
        return {
          id: typeof connection.id === 'string' ? connection.id : generateId('conn'),
          from: endpointId(connection.sourceId, 'output', semantic),
          to: endpointId(connection.targetId, 'input', semantic),
          metadata: typeof connection.type === 'string' ? { type: connection.type } : {},
        };
      }

      return null;
    })
    .filter(
      (connection): connection is ArchitectureModel['connections'][number] => connection !== null,
    );
}

export interface BuildArchitectureOptions {
  provider: ProviderType;
  name: string;
  now: string;
  /** Fold deprecated `externalActors` entries into block nodes (file import only). */
  materializeExternalActors?: boolean;
  /**
   * Rebuild endpoints from the node list instead of trusting the payload.
   * File import does this because exported JSON may predate the endpoint model;
   * snapshot restore must not, or a checkpoint would not round-trip.
   */
  regenerateEndpoints?: boolean;
}

export function buildArchitectureFromRaw(
  raw: Record<string, unknown>,
  options: BuildArchitectureOptions,
): ArchitectureModel {
  const nodes = buildNodes(raw);

  const externalActors = raw.externalActors as ArchitectureModel['externalActors'];
  if (
    options.materializeExternalActors &&
    Array.isArray(externalActors) &&
    externalActors.length > 0
  ) {
    const existingNodeIds = new Set(nodes.map((node) => node.id));
    nodes.push(...migrateExternalActorsToBlocks(externalActors, existingNodeIds, options.provider));
  }

  canonicalizeResourceNodes(nodes as unknown as CanonicalizableRawNode[], options.provider);

  return {
    id: (raw.id as string) || generateId('arch'),
    name: (raw.name as string) || options.name,
    version: (raw.version as string) || '1',
    nodes,
    endpoints:
      !options.regenerateEndpoints && Array.isArray(raw.endpoints)
        ? (raw.endpoints as ArchitectureModel['endpoints'])
        : nodes.flatMap((node) => generateEndpointsForBlock(node.id)),
    connections: buildConnections(raw),
    ...('externalActors' in raw
      ? { externalActors: raw.externalActors as ArchitectureModel['externalActors'] }
      : {}),
    createdAt: (raw.createdAt as string) || options.now,
    updatedAt: options.now,
  };
}

export interface IngestOptions extends BuildArchitectureOptions {
  source: IngestionSource;
  validateShape: (raw: unknown) => unknown;
}

export function ingestArchitecture(raw: unknown, options: IngestOptions): IngestionResult {
  canonicalizeRawArchitecture(raw, options.provider);

  try {
    options.validateShape(raw);
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          source: options.source,
          message: error instanceof Error ? error.message : 'Invalid architecture format',
        },
      ],
    };
  }

  if (!isRecord(raw)) {
    return {
      ok: false,
      issues: [
        { source: options.source, message: 'Invalid architecture format: root must be an object' },
      ],
    };
  }

  const architecture = buildArchitectureFromRaw(raw, options);
  const graphErrors = validateGraphInvariants(architecture);

  if (graphErrors.length > 0) {
    return {
      ok: false,
      issues: graphErrors.map((graphError) => ({
        source: options.source,
        message: graphError.message,
        blockId: graphError.targetId,
      })),
    };
  }

  return { ok: true, architecture };
}
