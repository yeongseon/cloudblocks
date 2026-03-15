import { validateArchitecture } from '../../validation/engine';
import type { ArchitectureSlice, ArchitectureState } from './types';

type ValidationSlice = Pick<ArchitectureState, 'validationResult' | 'validate'>;

export const createValidationSlice: ArchitectureSlice<ValidationSlice> = (
  set,
  get
) => ({
  validationResult: null,

  validate: () => {
    const state = get();
    const result = validateArchitecture(state.workspace.architecture);

    set({ validationResult: result });
    return result;
  },
});
