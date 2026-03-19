from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.dependencies import get_ai_api_key_repo, get_current_user, get_key_manager
from app.core.security import generate_id
from app.domain.models.ai_entities import AIApiKey
from app.domain.models.entities import User
from app.domain.models.repositories import AIApiKeyRepository

router = APIRouter(prefix="/ai/keys", tags=["ai"])


class StoreAIKeyRequest(BaseModel):
    provider: str
    key: str


class StoredAIKeyResponse(BaseModel):
    provider: str
    created_at: str


class DeleteAIKeyResponse(BaseModel):
    provider: str
    deleted: bool


@router.post("")
async def store_ai_key(
    body: StoreAIKeyRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    ai_api_key_repo: Annotated[AIApiKeyRepository, Depends(get_ai_api_key_repo)],
    key_manager: Annotated[Any, Depends(get_key_manager)],
) -> StoredAIKeyResponse:
    api_key = AIApiKey(
        id=generate_id(),
        user_id=current_user.id,
        provider=body.provider,
        encrypted_key=key_manager.encrypt(body.key),
    )
    saved = await ai_api_key_repo.upsert(api_key)
    return StoredAIKeyResponse(provider=saved.provider, created_at=saved.created_at.isoformat())


@router.get("")
async def list_ai_keys(
    current_user: Annotated[User, Depends(get_current_user)],
    ai_api_key_repo: Annotated[AIApiKeyRepository, Depends(get_ai_api_key_repo)],
) -> list[StoredAIKeyResponse]:
    api_keys = await ai_api_key_repo.list_by_user(current_user.id)
    return [
        StoredAIKeyResponse(provider=item.provider, created_at=item.created_at.isoformat())
        for item in api_keys
    ]


@router.delete("/{provider}")
async def delete_ai_key(
    provider: str,
    current_user: Annotated[User, Depends(get_current_user)],
    ai_api_key_repo: Annotated[AIApiKeyRepository, Depends(get_ai_api_key_repo)],
) -> DeleteAIKeyResponse:
    deleted = await ai_api_key_repo.delete_by_user_and_provider(current_user.id, provider)
    return DeleteAIKeyResponse(provider=provider, deleted=deleted)
