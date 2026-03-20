import { create } from 'zustand';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import type { ArchitectureSnapshot } from '../../shared/types/learning';
import {
  generateArchitecture,
  suggestImprovements,
  estimateCost,
} from './api';
import type {
  GenerateResponse,
  SuggestResponse,
  CostResponse,
} from './api';

interface AiState {
  generateLoading: boolean;
  generateError: string | null;
  generateResult: GenerateResponse | null;

  suggestLoading: boolean;
  suggestError: string | null;
  suggestResult: SuggestResponse | null;

  costLoading: boolean;
  costError: string | null;
  costResult: CostResponse | null;

  generate: (prompt: string, provider: string) => Promise<void>;
  suggest: (provider: string) => Promise<void>;
  estimateCost: (provider: string) => Promise<void>;
}

export const useAiStore = create<AiState>((set) => ({
  generateLoading: false,
  generateError: null,
  generateResult: null,

  suggestLoading: false,
  suggestError: null,
  suggestResult: null,

  costLoading: false,
  costError: null,
  costResult: null,

  generate: async (prompt, provider) => {
    set({ generateLoading: true, generateError: null });
    try {
      const result = await generateArchitecture({ prompt, provider });
      set({ generateResult: result, generateLoading: false });

      const arch = result.architecture as unknown as ArchitectureSnapshot;
      useArchitectureStore.getState().replaceArchitecture(arch);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate architecture';
      set({ generateError: message, generateLoading: false });
    }
  },

  suggest: async (provider) => {
    set({ suggestLoading: true, suggestError: null });
    try {
      const { workspace } = useArchitectureStore.getState();
      const architecture = workspace.architecture as unknown as Record<string, unknown>;
      const result = await suggestImprovements({ architecture, provider });
      set({ suggestResult: result, suggestLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get suggestions';
      set({ suggestError: message, suggestLoading: false });
    }
  },

  estimateCost: async (provider) => {
    set({ costLoading: true, costError: null });
    try {
      const { workspace } = useArchitectureStore.getState();
      const architecture = workspace.architecture as unknown as Record<string, unknown>;
      const result = await estimateCost({ architecture, provider });
      set({ costResult: result, costLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to estimate cost';
      set({ costError: message, costLoading: false });
    }
  },
}));
