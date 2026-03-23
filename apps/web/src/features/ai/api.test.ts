import { describe, it, expect, vi } from 'vitest';
import { generateArchitecture, suggestImprovements, estimateCost } from './api';
import type {
  GenerateRequest,
  SuggestRequest,
  CostRequest,
  GenerateResponse,
  SuggestResponse,
  CostResponse,
} from './api';

vi.mock('../../shared/api/client', () => ({
  apiPost: vi.fn(),
  isApiConfigured: vi.fn(() => true),
}));

import { apiPost, isApiConfigured } from '../../shared/api/client';

const mockedApiPost = vi.mocked(apiPost);
const mockedIsApiConfigured = vi.mocked(isApiConfigured);

describe('AI API client', () => {
  it('generateArchitecture calls apiPost with correct path and payload', async () => {
    const mockResponse: GenerateResponse = {
      architecture: { id: 'gen-1' },
      explanation: 'Created a VNet',
      warnings: [],
    };
    mockedApiPost.mockResolvedValueOnce(mockResponse);

    const req: GenerateRequest = { prompt: 'create a VNet', provider: 'azure' };
    const result = await generateArchitecture(req);

    expect(mockedApiPost).toHaveBeenCalledWith('/api/v1/ai/generate', req);
    expect(result).toEqual(mockResponse);
  });

  it('suggestImprovements calls apiPost with correct path and payload', async () => {
    const mockResponse: SuggestResponse = {
      suggestions: [
        {
          category: 'security',
          severity: 'high',
          message: 'Add NSG',
          action_description: 'Add a network security group',
        },
      ],
      score: { security: 0.5 },
    };
    mockedApiPost.mockResolvedValueOnce(mockResponse);

    const req: SuggestRequest = {
      architecture: { nodes: [] },
      provider: 'azure',
    };
    const result = await suggestImprovements(req);

    expect(mockedApiPost).toHaveBeenCalledWith('/api/v1/ai/suggest', req);
    expect(result).toEqual(mockResponse);
  });

  it('estimateCost calls apiPost with correct path and payload', async () => {
    const mockResponse: CostResponse = {
      monthly_cost: 150.0,
      hourly_cost: 0.21,
      currency: 'USD',
      resources: [
        { name: 'VM', monthly_cost: 100.0, details: {} },
        { name: 'Storage', monthly_cost: 50.0, details: {} },
      ],
    };
    mockedApiPost.mockResolvedValueOnce(mockResponse);

    const req: CostRequest = {
      architecture: { nodes: [] },
      provider: 'azure',
    };
    const result = await estimateCost(req);

    expect(mockedApiPost).toHaveBeenCalledWith('/api/v1/ai/cost', req);
    expect(result).toEqual(mockResponse);
  });

  it('propagates errors from apiPost', async () => {
    mockedApiPost.mockRejectedValueOnce(new Error('Network request failed'));

    const req: GenerateRequest = { prompt: 'test', provider: 'azure' };

    await expect(generateArchitecture(req)).rejects.toThrow('Network request failed');
  });

  it('throws when backend is not configured', async () => {
    mockedIsApiConfigured.mockReturnValueOnce(false);
    const req: GenerateRequest = { prompt: 'test', provider: 'azure' };
    await expect(generateArchitecture(req)).rejects.toThrow('AI features require the backend API');
  });
});
