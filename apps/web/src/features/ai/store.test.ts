import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAiStore } from './store';

const mockGenerate = vi.fn();
const mockSuggest = vi.fn();
const mockEstimateCost = vi.fn();

vi.mock('./api', () => ({
  generateArchitecture: (...args: unknown[]) => mockGenerate(...args),
  suggestImprovements: (...args: unknown[]) => mockSuggest(...args),
  estimateCost: (...args: unknown[]) => mockEstimateCost(...args),
}));

const mockReplaceArchitecture = vi.fn();
vi.mock('../../entities/store/architectureStore', () => ({
  useArchitectureStore: {
    getState: () => ({
      replaceArchitecture: mockReplaceArchitecture,
      workspace: {
        architecture: { plates: [], blocks: [], connections: [] },
      },
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  useAiStore.setState({
    generateLoading: false,
    generateError: null,
    generateResult: null,
    suggestLoading: false,
    suggestError: null,
    suggestResult: null,
    costLoading: false,
    costError: null,
    costResult: null,
  });
});

describe('useAiStore', () => {
  describe('generate', () => {
    it('sets loading true then stores result on success', async () => {
      const response = {
        architecture: { plates: [], blocks: [], connections: [] },
        explanation: 'done',
        warnings: [],
      };
      mockGenerate.mockResolvedValueOnce(response);

      await useAiStore.getState().generate('build a vpc', 'aws');

      expect(mockGenerate).toHaveBeenCalledWith({ prompt: 'build a vpc', provider: 'aws' });
      expect(useAiStore.getState().generateResult).toEqual(response);
      expect(useAiStore.getState().generateLoading).toBe(false);
      expect(useAiStore.getState().generateError).toBeNull();
    });

    it('calls replaceArchitecture with result on success', async () => {
      const arch = { plates: [], blocks: [], connections: [] };
      mockGenerate.mockResolvedValueOnce({
        architecture: arch,
        explanation: '',
        warnings: [],
      });

      await useAiStore.getState().generate('test', 'aws');
      expect(mockReplaceArchitecture).toHaveBeenCalledWith(arch);
    });

    it('sets error on failure', async () => {
      mockGenerate.mockRejectedValueOnce(new Error('API down'));

      await useAiStore.getState().generate('test', 'aws');

      expect(useAiStore.getState().generateError).toBe('API down');
      expect(useAiStore.getState().generateLoading).toBe(false);
      expect(useAiStore.getState().generateResult).toBeNull();
    });

    it('sets fallback error message for non-Error throws', async () => {
      mockGenerate.mockRejectedValueOnce('unknown failure');

      await useAiStore.getState().generate('test', 'aws');

      expect(useAiStore.getState().generateError).toBe('Failed to generate architecture');
    });

    it('sets error and skips replaceArchitecture when result has warnings', async () => {
      const response = {
        architecture: { plates: [], blocks: [], connections: [] },
        explanation: 'done',
        warnings: ['missing region plate'],
      };
      mockGenerate.mockResolvedValueOnce(response);

      await useAiStore.getState().generate('test', 'aws');

      expect(useAiStore.getState().generateError).toBe('AI output has warnings: missing region plate');
      expect(mockReplaceArchitecture).not.toHaveBeenCalled();
    });

    it('sets error when architecture shape is invalid', async () => {
      const response = {
        architecture: { plates: 'not-an-array', blocks: [], connections: [] },
        explanation: 'done',
        warnings: [],
      };
      mockGenerate.mockResolvedValueOnce(response);

      await useAiStore.getState().generate('test', 'aws');

      expect(useAiStore.getState().generateError).toBe('AI generated an invalid architecture that cannot be loaded.');
      expect(mockReplaceArchitecture).not.toHaveBeenCalled();
    });
  });

  describe('suggest', () => {
    it('sends current architecture and stores result', async () => {
      const response = {
        suggestions: [{ category: 'security', severity: 'warning', message: 'test', action_description: '' }],
        score: { security: 80 },
      };
      mockSuggest.mockResolvedValueOnce(response);

      await useAiStore.getState().suggest('aws');

      expect(mockSuggest).toHaveBeenCalledWith({
        architecture: { plates: [], blocks: [], connections: [] },
        provider: 'aws',
      });
      expect(useAiStore.getState().suggestResult).toEqual(response);
      expect(useAiStore.getState().suggestLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockSuggest.mockRejectedValueOnce(new Error('Suggest failed'));

      await useAiStore.getState().suggest('aws');

      expect(useAiStore.getState().suggestError).toBe('Suggest failed');
      expect(useAiStore.getState().suggestLoading).toBe(false);
    });

    it('sets fallback error for non-Error throws', async () => {
      mockSuggest.mockRejectedValueOnce(42);

      await useAiStore.getState().suggest('aws');

      expect(useAiStore.getState().suggestError).toBe('Failed to get suggestions');
    });
  });

  describe('estimateCost', () => {
    it('sends current architecture and stores result', async () => {
      const response = {
        monthly_cost: 100,
        hourly_cost: 0.14,
        currency: 'USD',
        resources: [{ name: 'ec2', monthly_cost: 100, details: {} }],
      };
      mockEstimateCost.mockResolvedValueOnce(response);

      await useAiStore.getState().estimateCost('aws');

      expect(mockEstimateCost).toHaveBeenCalledWith({
        architecture: { plates: [], blocks: [], connections: [] },
        provider: 'aws',
      });
      expect(useAiStore.getState().costResult).toEqual(response);
      expect(useAiStore.getState().costLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockEstimateCost.mockRejectedValueOnce(new Error('Cost failed'));

      await useAiStore.getState().estimateCost('aws');

      expect(useAiStore.getState().costError).toBe('Cost failed');
      expect(useAiStore.getState().costLoading).toBe(false);
    });

    it('sets fallback error for non-Error throws', async () => {
      mockEstimateCost.mockRejectedValueOnce(null);

      await useAiStore.getState().estimateCost('aws');

      expect(useAiStore.getState().costError).toBe('Failed to estimate cost');
    });
  });

});
