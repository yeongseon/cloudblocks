import { create } from 'zustand';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import type { ArchitectureSnapshot } from '../../shared/types/learning';
import type { ArchitectureModel } from '@cloudblocks/schema';
import { validateArchitecture } from '../../entities/validation/engine';
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
      const arch = result.architecture as unknown as ArchitectureSnapshot;
      const currentArch = useArchitectureStore.getState().workspace.architecture;
      const candidate: ArchitectureModel = {
        ...currentArch,
        ...arch,
        id: currentArch.id,
        createdAt: currentArch.createdAt,
        updatedAt: currentArch.updatedAt,
      };
      const validation = validateArchitecture(candidate);

      if (!validation.valid) {
        const firstError = validation.errors[0];
        const message = firstError?.message ?? 'AI generated an invalid architecture';
        set({ generateError: message, generateLoading: false, generateResult: null });
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert(message);
        }
        return;
      }

      set({ generateResult: result, generateLoading: false });
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
