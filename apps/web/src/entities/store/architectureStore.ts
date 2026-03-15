import { create } from 'zustand';
import { createDomainSlice } from './slices/domainSlice';
import { createHistorySlice } from './slices/historySlice';
import { createPersistenceSlice } from './slices/persistenceSlice';
import { createValidationSlice } from './slices/validationSlice';
import { createWorkspaceSlice } from './slices/workspaceSlice';
import type { ArchitectureState } from './slices/types';

export type { ArchitectureState } from './slices/types';

export const useArchitectureStore = create<ArchitectureState>()((...a) => ({
  ...createWorkspaceSlice(...a),
  ...createValidationSlice(...a),
  ...createHistorySlice(...a),
  ...createDomainSlice(...a),
  ...createPersistenceSlice(...a),
}));

let autoValidateTimer: ReturnType<typeof setTimeout> | null = null;
const AUTO_VALIDATE_DELAY_MS = 300;

useArchitectureStore.subscribe((state, prevState) => {
  const archChanged =
    state.workspace.architecture !== prevState.workspace.architecture;

  if (archChanged && state.validationResult === null) {
    if (autoValidateTimer) {
      clearTimeout(autoValidateTimer);
    }

    autoValidateTimer = setTimeout(() => {
      useArchitectureStore.getState().validate();
    }, AUTO_VALIDATE_DELAY_MS);
  }
});
