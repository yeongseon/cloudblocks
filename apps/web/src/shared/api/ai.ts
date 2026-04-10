import { apiPost, isApiConfigured } from './client';
import type {
  CostRequest,
  CostResponse,
  GenerateRequest,
  GenerateResponse,
  SuggestRequest,
  SuggestResponse,
} from '../types/ai';

const BACKEND_REQUIRED_MESSAGE = 'AI features require the backend API - see setup guide.';

function assertAiBackendConfigured(): void {
  if (!isApiConfigured()) {
    throw new Error(BACKEND_REQUIRED_MESSAGE);
  }
}

export async function generateArchitecture(req: GenerateRequest): Promise<GenerateResponse> {
  assertAiBackendConfigured();
  return apiPost<GenerateResponse>('/api/v1/ai/generate', req);
}

export async function suggestImprovements(req: SuggestRequest): Promise<SuggestResponse> {
  assertAiBackendConfigured();
  return apiPost<SuggestResponse>('/api/v1/ai/suggest', req);
}

export async function estimateCost(req: CostRequest): Promise<CostResponse> {
  assertAiBackendConfigured();
  return apiPost<CostResponse>('/api/v1/ai/cost', req);
}
