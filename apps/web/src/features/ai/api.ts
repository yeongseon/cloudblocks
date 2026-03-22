import { apiPost, isApiConfigured } from '../../shared/api/client';

const BACKEND_REQUIRED_MESSAGE = 'AI features require the backend API - see setup guide.';

function assertAiBackendConfigured(): void {
  if (!isApiConfigured()) {
    throw new Error(BACKEND_REQUIRED_MESSAGE);
  }
}

// ─── Request Types ─────────────────────────────────────────

export interface GenerateRequest {
  prompt: string;
  provider: string;
  complexity?: string;
}

export interface SuggestRequest {
  architecture: Record<string, unknown>;
  provider: string;
}

export interface CostRequest {
  architecture: Record<string, unknown>;
  provider: string;
}

// ─── Response Types ────────────────────────────────────────

export interface GenerateResponse {
  architecture: Record<string, unknown>;
  explanation: string;
  warnings: string[];
}

export interface AiSuggestion {
  category: string;
  severity: string;
  message: string;
  action_description: string;
}

export interface SuggestResponse {
  suggestions: AiSuggestion[];
  score: Record<string, number>;
}

export interface CostResource {
  name: string;
  monthly_cost: number;
  details: Record<string, unknown>;
}

export interface CostResponse {
  monthly_cost: number;
  hourly_cost: number;
  currency: string;
  resources: CostResource[];
}

// ─── API Functions ─────────────────────────────────────────

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
