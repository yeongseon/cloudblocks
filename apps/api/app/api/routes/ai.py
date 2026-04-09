from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.application.use_cases.ai_use_cases import (
    EstimateArchitectureCostUseCase,
    GenerateArchitectureUseCase,
    SuggestArchitectureImprovementsUseCase,
)
from app.core.dependencies import (
    get_current_user,
    get_estimate_architecture_cost_use_case,
    get_generate_architecture_use_case,
    get_suggest_architecture_improvements_use_case,
)
from app.domain.models.ai_entities import (
    AIGenerationRequest,
    AIGenerationResponse,
    AISuggestionsResponse,
    CostEstimate,
)
from app.domain.models.entities import User

router = APIRouter(prefix="/ai", tags=["ai"])


class AISuggestRequest(BaseModel):
    architecture: dict[str, object]
    provider: str = "aws"


class AICostRequest(BaseModel):
    architecture: dict[str, object]
    provider: str = "aws"


@router.post("/generate")
async def generate_architecture(
    request: AIGenerationRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[GenerateArchitectureUseCase, Depends(get_generate_architecture_use_case)],
) -> AIGenerationResponse:
    return await use_case.execute(
        user_id=current_user.id,
        prompt=request.prompt,
        provider=request.provider,
        complexity=request.complexity,
    )


@router.post("/suggest")
async def suggest_improvements(
    request: AISuggestRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[
        SuggestArchitectureImprovementsUseCase,
        Depends(get_suggest_architecture_improvements_use_case),
    ],
) -> AISuggestionsResponse:
    return await use_case.execute(
        user_id=current_user.id,
        architecture=request.architecture,
        provider=request.provider,
    )


@router.post("/cost")
async def estimate_cost(
    request: AICostRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[
        EstimateArchitectureCostUseCase,
        Depends(get_estimate_architecture_cost_use_case),
    ],
) -> CostEstimate:
    _ = current_user
    return await use_case.execute(request.architecture)
