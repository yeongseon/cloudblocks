import type { ArchitectureModel, Workspace } from './index';
import { buildPlateSizeFromProfileId, inferLegacyPlateProfileId } from './index';

/**
 * SCHEMA_VERSION: Controls the serialization/storage format.
 * Bump when the shape of SerializedData or Workspace changes.
 * Used to detect incompatible localStorage data and trigger migrations.
 *
 * This is separate from ArchitectureModel.version, which tracks
 * the user's architecture revision (user-facing, incremented on save/export).
 */
export const SCHEMA_VERSION = '0.1.0';

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

  if (data.schemaVersion !== SCHEMA_VERSION) {
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
          plate.profileId = inferLegacyPlateProfileId({
            type: plate.type,
            size: { width: plate.size.width, depth: plate.size.depth },
          });
          const profileSize = buildPlateSizeFromProfileId(plate.profileId);
          plate.size = profileSize;
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
      { id: 'ext-internet', name: 'Internet', type: 'internet' },
    ],
    createdAt: now,
    updatedAt: now,
  };
}
