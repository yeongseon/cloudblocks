import { isApiConfigured } from '../../../shared/api/client';
import { estimateCost, generateArchitecture, suggestImprovements } from '../../../features/ai/api';
import type { CostResponse, GenerateResponse, SuggestResponse } from '../../../features/ai/api';
import type { ArchitectureSnapshot } from '../../../shared/types/learning';
import { validateArchitectureShape } from './index';
import type { ArchitectureSlice, ArchitectureState } from './types';

type AiSlice = Pick<
  ArchitectureState,
  | 'generateLoading'
  | 'generateError'
  | 'generateResult'
  | 'suggestLoading'
  | 'suggestError'
  | 'suggestResult'
  | 'costLoading'
  | 'costError'
  | 'costResult'
  | 'generate'
  | 'suggest'
  | 'estimateCost'
>;

const AI_BACKEND_REQUIRED_MESSAGE = 'AI features require the backend API - see setup guide.';

export const createAiSlice: ArchitectureSlice<AiSlice> = (set, get) => ({
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
    if (!isApiConfigured()) {
      set({
        generateLoading: false,
        generateError: AI_BACKEND_REQUIRED_MESSAGE,
        generateResult: null,
      });
      return;
    }

    set({ generateLoading: true, generateError: null });
    try {
      const result: GenerateResponse = await generateArchitecture({ prompt, provider });
      set({ generateResult: result, generateLoading: false });

      if (result.warnings.length > 0) {
        set({ generateError: `AI output has warnings: ${result.warnings.join('; ')}` });
        return;
      }

      try {
        validateArchitectureShape(result.architecture);
      } catch {
        set({ generateError: 'AI generated an invalid architecture that cannot be loaded.' });
        return;
      }

      get().replaceArchitecture(result.architecture as unknown as ArchitectureSnapshot);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate architecture';
      set({ generateError: message, generateLoading: false, generateResult: null });
    }
  },

  suggest: async (provider) => {
    if (!isApiConfigured()) {
      set({
        suggestLoading: false,
        suggestError: AI_BACKEND_REQUIRED_MESSAGE,
        suggestResult: null,
      });
      return;
    }

    set({ suggestLoading: true, suggestError: null });
    try {
      const architecture = get().workspace.architecture as unknown as Record<string, unknown>;
      const result: SuggestResponse = await suggestImprovements({ architecture, provider });
      set({ suggestResult: result, suggestLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get suggestions';
      set({ suggestError: message, suggestLoading: false, suggestResult: null });
    }
  },

  estimateCost: async (provider) => {
    if (!isApiConfigured()) {
      set({
        costLoading: false,
        costError: AI_BACKEND_REQUIRED_MESSAGE,
        costResult: null,
      });
      return;
    }

    set({ costLoading: true, costError: null });
    try {
      const architecture = get().workspace.architecture as unknown as Record<string, unknown>;
      const result: CostResponse = await estimateCost({ architecture, provider });
      set({ costResult: result, costLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to estimate cost';
      set({ costError: message, costLoading: false, costResult: null });
    }
  },
});
