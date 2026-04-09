from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AIGenerationRequest(BaseModel):
    prompt: str
    provider: str = "aws"  # 'aws' | 'azure' | 'gcp'
    complexity: str = "intermediate"  # 'simple' | 'intermediate' | 'advanced'


class AIGenerationResponse(BaseModel):
    architecture: dict[str, object]
    explanation: str = ""
    warnings: list[str] = Field(default_factory=list)


class AISuggestion(BaseModel):
    category: str  # 'security' | 'reliability' | 'best_practice'
    severity: str  # 'critical' | 'warning' | 'info'
    message: str
    action_description: str = ""


class AISuggestionsResponse(BaseModel):
    status: str = "success"
    suggestions: list[AISuggestion] = Field(default_factory=list)
    score: dict[str, int | float] = Field(default_factory=dict)
    error_message: str | None = None


class CostResource(BaseModel):
    name: str
    monthly_cost: float
    details: dict[str, object] = Field(default_factory=dict)


class CostEstimate(BaseModel):
    monthly_cost: float
    hourly_cost: float
    currency: str = "USD"
    resources: list[CostResource] = Field(default_factory=list)


class AIApiKey(BaseModel):
    id: str
    user_id: str
    provider: str  # 'openai'
    encrypted_key: str
    created_at: datetime = Field(default_factory=_utcnow)
