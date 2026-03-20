import type { ArchitectureModel, Position, Workspace } from './index';
import { buildPlateSizeFromProfileId, inferLegacyPlateProfileId } from './index';

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
export const SCHEMA_VERSION = '2.0.0';

/**
 * v1.x schema versions that are explicitly rejected (clean start, no migration).
 * See CLOUDBLOCKS_SPEC_V2.md §16.
 */
const LEGACY_VERSIONS = ['0.1.0', '0.2.0'];

const SUPPORTED_VERSIONS = [SCHEMA_VERSION];

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
        'CloudBlocks v2.0 uses a new format. Please create a new workspace.'
    );
  }

  if (!SUPPORTED_VERSIONS.includes(data.schemaVersion)) {
    console.warn(
      `Schema version mismatch: expected ${SCHEMA_VERSION}, got ${data.schemaVersion}. ` +
        'Data may need migration.'
    );
  }

  const workspaces = data.workspaces ?? [];

  for (const ws of workspaces) {
    if (ws.architecture?.plates) {
      for (const plate of ws.architecture.plates) {
        if (!plate.profileId) {
          const inferredProfileId = inferLegacyPlateProfileId({
            type: plate.type,
            size: { width: plate.size.width, depth: plate.size.depth },
          });
          plate.profileId = inferredProfileId;
          const profileSize = buildPlateSizeFromProfileId(inferredProfileId);
          plate.size = profileSize;
        }
      }
    }

    if (ws.architecture?.externalActors) {
      for (const actor of ws.architecture.externalActors) {
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
export function createBlankArchitecture(
  id: string,
  name: string
): ArchitectureModel {
  const now = new Date().toISOString();
  return {
    id,
    name,
    version: '1',
    plates: [],
    blocks: [],
    connections: [],
    externalActors: [
      {
        id: 'ext-internet',
        name: 'Internet',
        type: 'internet',
        position: { ...DEFAULT_EXTERNAL_ACTOR_POSITION },
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}
