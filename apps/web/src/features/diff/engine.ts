import type {
  ArchitectureModel,
  Block,
  Connection,
  ExternalActor,
  Plate,
} from '../../shared/types';
import type { DiffDelta, DiffState, EntityDiff, PropertyChange } from '../../shared/types/diff';

const ROOT_VOLATILE_PATHS = new Set(['createdAt', 'updatedAt']);
const NO_IGNORED_ROOT_PATHS = new Set<string>();

type DiffableEntity = Plate | Block | Connection | ExternalActor;

function sortById<T extends { id: string }>(left: T, right: T): number {
  return left.id.localeCompare(right.id);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function diffValues(
  beforeValue: unknown,
  afterValue: unknown,
  currentPath = '',
  ignoredRootPaths: ReadonlySet<string> = NO_IGNORED_ROOT_PATHS,
): PropertyChange[] {
  if (beforeValue === undefined && afterValue === undefined) {
    return [];
  }

  if (Array.isArray(beforeValue) && Array.isArray(afterValue)) {
    if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) {
      return [];
    }

    return [
      {
        path: currentPath,
        oldValue: beforeValue,
        newValue: afterValue,
      },
    ];
  }

  if (isRecord(beforeValue) && isRecord(afterValue)) {
    const keys = Array.from(new Set([...Object.keys(beforeValue), ...Object.keys(afterValue)])).sort(
      (left, right) => left.localeCompare(right),
    );
    const changes: PropertyChange[] = [];

    for (const key of keys) {
      if (!currentPath && ignoredRootPaths.has(key)) {
        continue;
      }

      const nextPath = currentPath ? `${currentPath}.${key}` : key;
      changes.push(...diffValues(beforeValue[key], afterValue[key], nextPath, ignoredRootPaths));
    }

    return changes;
  }

  if (!Object.is(beforeValue, afterValue)) {
    return [
      {
        path: currentPath,
        oldValue: beforeValue,
        newValue: afterValue,
      },
    ];
  }

  return [];
}

function compareEntityCollections<T extends DiffableEntity>(
  baseEntities: T[],
  headEntities: T[],
): EntityDiff<T> {
  const baseMap = new Map(baseEntities.map((entity) => [entity.id, entity]));
  const headMap = new Map(headEntities.map((entity) => [entity.id, entity]));

  const added = headEntities.filter((entity) => !baseMap.has(entity.id));
  const removed = baseEntities.filter((entity) => !headMap.has(entity.id));

  const modified = baseEntities.flatMap((baseEntity) => {
    const headEntity = headMap.get(baseEntity.id);
    if (!headEntity) {
      return [];
    }

    const changes = diffValues(baseEntity, headEntity);
    if (changes.length === 0) {
      return [];
    }

    return [
      {
        id: baseEntity.id,
        before: baseEntity,
        after: headEntity,
        changes,
      },
    ];
  });

  return {
    added,
    removed,
    modified,
  };
}

function computeSummary(delta: Omit<DiffDelta, 'summary'>): DiffDelta['summary'] {
  const totalChanges =
    delta.plates.added.length +
    delta.plates.removed.length +
    delta.plates.modified.length +
    delta.blocks.added.length +
    delta.blocks.removed.length +
    delta.blocks.modified.length +
    delta.connections.added.length +
    delta.connections.removed.length +
    delta.connections.modified.length +
    delta.externalActors.added.length +
    delta.externalActors.removed.length +
    delta.externalActors.modified.length;

  return {
    totalChanges,
    hasBreakingChanges: delta.blocks.removed.length > 0 || delta.connections.removed.length > 0,
  };
}

function createEmptyEntityDiff<T extends DiffableEntity>(): EntityDiff<T> {
  return {
    added: [],
    removed: [],
    modified: [],
  };
}

export function normalizeArchitecture(model: ArchitectureModel): ArchitectureModel {
  return {
    ...model,
    plates: model.plates
      .map((plate) => ({
        ...plate,
        children: [...plate.children].sort((left, right) => left.localeCompare(right)),
        position: { ...plate.position },
        size: { ...plate.size },
        metadata: { ...plate.metadata },
      }))
      .sort(sortById),
    blocks: model.blocks
      .map((block) => ({
        ...block,
        position: { ...block.position },
        metadata: { ...block.metadata },
      }))
      .sort(sortById),
    connections: model.connections
      .map((connection) => ({
        ...connection,
        metadata: { ...connection.metadata },
      }))
      .sort(sortById),
    externalActors: model.externalActors
      .map((externalActor) => ({ ...externalActor }))
      .sort(sortById),
  };
}

export function computeArchitectureDiff(base: ArchitectureModel, head: ArchitectureModel): DiffDelta {
  const normalizedBase = normalizeArchitecture(base);
  const normalizedHead = normalizeArchitecture(head);

  const modelChanges = diffValues(normalizedBase, normalizedHead, '', ROOT_VOLATILE_PATHS);
  if (modelChanges.length === 0) {
    return {
      plates: createEmptyEntityDiff<Plate>(),
      blocks: createEmptyEntityDiff<Block>(),
      connections: createEmptyEntityDiff<Connection>(),
      externalActors: createEmptyEntityDiff<ExternalActor>(),
      summary: {
        totalChanges: 0,
        hasBreakingChanges: false,
      },
    };
  }

  const deltaWithoutSummary = {
    plates: compareEntityCollections(normalizedBase.plates, normalizedHead.plates),
    blocks: compareEntityCollections(normalizedBase.blocks, normalizedHead.blocks),
    connections: compareEntityCollections(normalizedBase.connections, normalizedHead.connections),
    externalActors: compareEntityCollections(normalizedBase.externalActors, normalizedHead.externalActors),
  };

  return {
    ...deltaWithoutSummary,
    summary: computeSummary(deltaWithoutSummary),
  };
}

export function getDiffState(entityId: string, delta: DiffDelta): DiffState {
  const entityDiffs = [delta.plates, delta.blocks, delta.connections, delta.externalActors];

  if (entityDiffs.some((diff) => diff.added.some((entity) => entity.id === entityId))) {
    return 'added';
  }

  if (entityDiffs.some((diff) => diff.removed.some((entity) => entity.id === entityId))) {
    return 'removed';
  }

  if (entityDiffs.some((diff) => diff.modified.some((entity) => entity.id === entityId))) {
    return 'modified';
  }

  return 'unchanged';
}
