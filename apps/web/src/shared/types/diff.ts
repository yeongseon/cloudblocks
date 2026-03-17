// Architecture Diff Types — Milestone 7
// ⚠️ MUST be in shared/types/ (FSD: entities layer imports these)

import type { Plate, Block, Connection, ExternalActor } from './index';

export interface EntityDiff<T> {
  added: T[];
  removed: T[];
  modified: Array<ModifiedEntity<T>>;
}

export interface ModifiedEntity<T> {
  id: string;
  before: T;
  after: T;
  changes: PropertyChange[];
}

export interface DiffDelta {
  plates: EntityDiff<Plate>;
  blocks: EntityDiff<Block>;
  connections: EntityDiff<Connection>;
  externalActors: EntityDiff<ExternalActor>;
  summary: {
    totalChanges: number;
    hasBreakingChanges: boolean;
  };
}

export interface PropertyChange {
  path: string;
  oldValue: unknown;
  newValue: unknown;
}

export type DiffState = 'added' | 'removed' | 'modified' | 'unchanged';
