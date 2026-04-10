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
