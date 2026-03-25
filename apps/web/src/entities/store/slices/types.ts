import type { StateCreator } from 'zustand';
import type { LastPrResult, ContainerBlockProfileId, Workspace } from '../../../shared/types/index';
import type {
  ArchitectureModel,
  ConnectionType,
  LayerType,
  ProviderType,
  ResourceCategory,
} from '@cloudblocks/schema';
import type { ValidationResult } from '@cloudblocks/domain';
import type { ArchitectureSnapshot } from '../../../shared/types/learning';
import type { ArchitectureTemplate } from '../../../shared/types/template';

type PlateLayerType = 'global' | 'edge' | 'region' | 'zone' | 'subnet';

// ---------------------------------------------------------------------------
// Unified Node API — discriminated-union input types
// ---------------------------------------------------------------------------

export type AddNodeInput =
  | {
      kind: 'container';
      resourceType: string;
      name: string;
      parentId: string | null;
      layer: LayerType;
      profileId?: ContainerBlockProfileId;
    }
  | {
      kind: 'resource';
      resourceType: string;
      name: string;
      parentId: string | null;
      provider?: ProviderType;
      subtype?: string;
      config?: Record<string, unknown>;
    };

export interface RemoveNodeOptions {
  /** Whether to cascade-delete children. Defaults to true for containers, false for resources. */
  cascade?: boolean;
}
export interface ArchitectureState {
  workspace: Workspace;
  workspaces: Workspace[];
  validationResult: ValidationResult | null;

  history: { past: ArchitectureModel[]; future: ArchitectureModel[] };
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // ── Unified Node API ──────────────────────────────────────────────
  addNode: (input: AddNodeInput) => void;
  removeNode: (id: string, options?: RemoveNodeOptions) => void;
  renameNode: (id: string, newName: string) => void;
  moveNodePosition: (id: string, deltaX: number, deltaZ: number) => void;
  updateNodeMetadata: (id: string, key: string, value: unknown) => void;

  // ── Deprecated — use unified API above ─────────────────────────
  /** @deprecated Use addNode({ kind: 'container', ... }) */
  addPlate: (
    type: PlateLayerType,
    name: string,
    parentId: string | null,
    profileId?: ContainerBlockProfileId,
  ) => void;
  /** @deprecated Use removeNode(id) */
  removePlate: (id: string) => void;

  /** @deprecated Use addNode({ kind: 'resource', ... }) */
  addBlock: (
    category: ResourceCategory,
    name: string,
    placementId: string,
    provider?: ProviderType,
    subtype?: string,
    config?: Record<string, unknown>,
  ) => void;
  /** @deprecated Use addNode + duplicate logic */
  duplicateBlock: (blockId: string) => void;
  /** @deprecated Use removeNode(id) */
  removeBlock: (id: string) => void;
  /** @deprecated Use renameNode(id, name) */
  renameBlock: (blockId: string, newName: string) => void;
  /** @deprecated Use renameNode(id, name) */
  renamePlate: (plateId: string, newName: string) => void;
  moveBlock: (blockId: string, newPlacementId: string) => void;
  setPlateProfile: (plateId: string, profileId: ContainerBlockProfileId) => void;
  /** @deprecated Use moveNodePosition(id, dx, dz) */
  movePlatePosition: (id: string, deltaX: number, deltaZ: number) => void;
  /** @deprecated Use moveNodePosition(id, dx, dz) */
  moveBlockPosition: (id: string, deltaX: number, deltaZ: number) => void;
  moveActorPosition: (id: string, deltaX: number, deltaZ: number) => void;
  addExternalActor: (
    type: 'internet' | 'browser',
    position?: { x: number; y: number; z: number },
  ) => void;
  removeExternalActor: (id: string) => void;

  addConnection: (from: string, to: string) => boolean;
  removeConnection: (id: string) => void;
  updateConnectionType: (connectionId: string, type: ConnectionType) => void;

  validate: () => ValidationResult;

  saveToStorage: () => boolean;
  loadFromStorage: () => void;
  resetWorkspace: () => void;
  renameWorkspace: (name: string) => void;

  createWorkspace: (name: string) => void;
  switchWorkspace: (id: string) => void;
  deleteWorkspace: (id: string) => void;
  cloneWorkspace: (id: string) => void;
  importArchitecture: (json: string) => string | null;
  exportArchitecture: () => string;
  loadFromTemplate: (template: ArchitectureTemplate) => void;
  replaceArchitecture: (snapshot: ArchitectureSnapshot) => void;
  setBackendWorkspaceId: (workspaceId: string, backendId: string) => void;
  setGithubRepo: (workspaceId: string, repo: string | undefined) => void;
  setLastPrResult: (workspaceId: string, result: LastPrResult) => void;
}

export type ArchitectureSlice<T> = StateCreator<ArchitectureState, [], [], T>;
