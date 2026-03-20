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

/** Describes the comparison direction so the UI can label sides correctly. */
export type DiffDirection = 'github-to-local' | 'local-to-local';

export interface DiffDelta {
  plates: EntityDiff<Plate>;
  blocks: EntityDiff<Block>;
  connections: EntityDiff<Connection>;
  externalActors: EntityDiff<ExternalActor>;
  /** Root-level architecture metadata changes (name, version, etc.). */
  metadata: PropertyChange[];
  summary: {
    totalChanges: number;
    hasBreakingChanges: boolean;
  };
  /** Describes the comparison direction so diff badges/labels are unambiguous. */
  direction: DiffDirection;
}

export interface PropertyChange {
  path: string;
  oldValue: unknown;
  newValue: unknown;
}

export type DiffState = 'added' | 'removed' | 'modified' | 'unchanged';
