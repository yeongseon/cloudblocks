import type { DiffDelta, DiffState } from '../types/diff';

export function getDiffState(entityId: string, delta: DiffDelta): DiffState {
  const entityDiffs = [delta.plates, delta.blocks, delta.connections];

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
