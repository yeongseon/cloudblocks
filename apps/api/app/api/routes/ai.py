from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.config import settings
from app.core.dependencies import get_ai_api_key_repo, get_current_user, get_key_manager
from app.core.errors import GenerationError, ValidationError
from app.domain.models.ai_entities import (
    AIGenerationRequest,
    AIGenerationResponse,
    AISuggestionsResponse,
)
from app.domain.models.entities import User
from app.domain.models.repositories import AIApiKeyRepository
from app.engines.prompts.architecture_prompt import build_architecture_prompt
from app.infrastructure.llm.client import LLMError, OpenAIClient
from app.infrastructure.llm.key_manager import KeyManager

router = APIRouter(prefix="/ai", tags=["ai"])


class AISuggestRequest(BaseModel):
    architecture: dict[str, object]


def build_system_prompt(provider: str, complexity: str) -> str:
    prompt = build_architecture_prompt(provider)
    return f"{prompt}\n\nComplexity target: {complexity}."


@router.post("/generate")
async def generate_architecture(
    request: AIGenerationRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    ai_api_key_repo: Annotated[AIApiKeyRepository, Depends(get_ai_api_key_repo)],
    key_manager: Annotated[KeyManager, Depends(get_key_manager)],
) -> AIGenerationResponse:
    api_keys = await ai_api_key_repo.list_by_user(current_user.id)
    openai_key = next((item for item in api_keys if item.provider.lower() == "openai"), None)
    if openai_key is None:
        raise ValidationError("No OpenAI API key stored. Please add one via /api/v1/ai/keys")

    decrypted_key = key_manager.decrypt(openai_key.encrypted_key)
    client = OpenAIClient(
        api_key=decrypted_key,
        base_url=settings.llm_provider_url,
        model=settings.llm_model,
        max_tokens=settings.llm_max_tokens,
        timeout=settings.llm_request_timeout,
    )
    system_prompt = build_system_prompt(request.provider, request.complexity)

    try:
        architecture = await client.generate(
            system_prompt=system_prompt,
            user_prompt=request.prompt,
        )
    except LLMError as exc:
        raise GenerationError(f"AI generation failed: {exc}") from exc

    return AIGenerationResponse(architecture=architecture)


@router.post("/suggest")
async def suggest_improvements(
    request: AISuggestRequest,
    current_user: Annotated[User, Depends(get_current_user)],
) -> AISuggestionsResponse:
    _ = request
    _ = current_user
    return AISuggestionsResponse(suggestions=[], score={})
