from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.application.use_cases.ai_keys_use_cases import (
    DeleteAIKeyUseCase,
    ListAIKeysUseCase,
    StoreAIKeyUseCase,
)
from app.core.dependencies import (
    get_current_user,
    get_delete_ai_key_use_case,
    get_list_ai_keys_use_case,
    get_store_ai_key_use_case,
)
from app.domain.models.entities import User

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
    use_case: Annotated[StoreAIKeyUseCase, Depends(get_store_ai_key_use_case)],
) -> StoredAIKeyResponse:
    saved = await use_case.execute(current_user.id, body.provider, body.key)
    return StoredAIKeyResponse(provider=saved.provider, created_at=saved.created_at.isoformat())


@router.get("")
async def list_ai_keys(
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[ListAIKeysUseCase, Depends(get_list_ai_keys_use_case)],
) -> list[StoredAIKeyResponse]:
    api_keys = await use_case.execute(current_user.id)
    return [
        StoredAIKeyResponse(provider=item.provider, created_at=item.created_at.isoformat())
        for item in api_keys
    ]


@router.delete("/{provider}")
async def delete_ai_key(
    provider: str,
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[DeleteAIKeyUseCase, Depends(get_delete_ai_key_use_case)],
) -> DeleteAIKeyResponse:
    deleted = await use_case.execute(current_user.id, provider)
    return DeleteAIKeyResponse(provider=provider, deleted=deleted)
