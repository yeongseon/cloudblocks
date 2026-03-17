import type { StateCreator } from 'zustand';
import type {
  ArchitectureModel,
  BlockCategory,
  PlateProfileId,
  PlateType,
  SubnetAccess,
  ValidationResult,
  Workspace,
} from '../../../shared/types/index';
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

  addBlock: (category: BlockCategory, name: string, placementId: string) => void;
  removeBlock: (id: string) => void;
  moveBlock: (blockId: string, newPlacementId: string) => void;
  setPlateProfile: (plateId: string, profileId: PlateProfileId) => void;
  movePlatePosition: (id: string, deltaX: number, deltaZ: number) => void;
  moveBlockPosition: (id: string, deltaX: number, deltaZ: number) => void;

  addConnection: (sourceId: string, targetId: string) => void;
  removeConnection: (id: string) => void;

  validate: () => ValidationResult;

  saveToStorage: () => void;
  loadFromStorage: () => void;
  resetWorkspace: () => void;
  renameWorkspace: (name: string) => void;

  createWorkspace: (name: string) => void;
  switchWorkspace: (id: string) => void;
  deleteWorkspace: (id: string) => void;
  cloneWorkspace: (id: string) => void;
  importArchitecture: (json: string) => void;
  exportArchitecture: () => string;
  loadFromTemplate: (template: ArchitectureTemplate) => void;
  replaceArchitecture: (snapshot: ArchitectureSnapshot) => void;
}

export type ArchitectureSlice<T> = StateCreator<ArchitectureState, [], [], T>;
