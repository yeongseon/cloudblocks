import type { StateCreator } from 'zustand';
import type { LastPrResult, PlateProfileId, Workspace } from '../../../shared/types/index';
import type { ArchitectureModel, BlockCategory, ProviderType, PlateType, SubnetAccess } from '@cloudblocks/schema';
import type { ValidationResult } from '@cloudblocks/domain';
import type { ArchitectureSnapshot } from '../../../shared/types/learning';
import type { ArchitectureTemplate } from '../../../shared/types/template';

export interface ArchitectureState {
  workspace: Workspace;
  workspaces: Workspace[];
  validationResult: ValidationResult | null;

  history: { past: ArchitectureModel[]; future: ArchitectureModel[] };
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  addPlate: (
    type: PlateType,
    name: string,
    parentId: string | null,
    subnetAccess?: SubnetAccess,
    profileId?: PlateProfileId
  ) => void;
  removePlate: (id: string) => void;

  addBlock: (
    category: BlockCategory,
    name: string,
    placementId: string,
    provider?: ProviderType,
    subtype?: string,
    config?: Record<string, unknown>,
  ) => void;
  duplicateBlock: (blockId: string) => void;
  removeBlock: (id: string) => void;
  renameBlock: (blockId: string, newName: string) => void;
  renamePlate: (plateId: string, newName: string) => void;
  updateBlockConfig: (blockId: string, config: Record<string, unknown>) => void;
  moveBlock: (blockId: string, newPlacementId: string) => void;
  setPlateProfile: (plateId: string, profileId: PlateProfileId) => void;
  movePlatePosition: (id: string, deltaX: number, deltaZ: number) => void;
  moveBlockPosition: (id: string, deltaX: number, deltaZ: number) => void;
  moveActorPosition: (id: string, deltaX: number, deltaZ: number) => void;

  addConnection: (sourceId: string, targetId: string) => boolean;
  removeConnection: (id: string) => void;
  updateConnectionType: (connectionId: string, type: import('@cloudblocks/schema').ConnectionType) => void;

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
