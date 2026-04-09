from __future__ import annotations

from typing import final

from app.core.security import generate_id
from app.domain.models.ai_entities import AIApiKey
from app.domain.models.repositories import AIApiKeyRepository
from app.infrastructure.llm.key_manager import KeyManager


@final
class StoreAIKeyUseCase:
    def __init__(self, ai_api_key_repo: AIApiKeyRepository, key_manager: KeyManager) -> None:
        self._ai_api_key_repo: AIApiKeyRepository = ai_api_key_repo
        self._key_manager: KeyManager = key_manager

    async def execute(self, user_id: str, provider: str, key: str) -> AIApiKey:
        api_key = AIApiKey(
            id=generate_id(),
            user_id=user_id,
            provider=provider,
            encrypted_key=self._key_manager.encrypt(key),
        )
        return await self._ai_api_key_repo.upsert(api_key)


@final
class ListAIKeysUseCase:
    def __init__(self, ai_api_key_repo: AIApiKeyRepository) -> None:
        self._ai_api_key_repo: AIApiKeyRepository = ai_api_key_repo

    async def execute(self, user_id: str) -> list[AIApiKey]:
        return await self._ai_api_key_repo.list_by_user(user_id)


@final
class DeleteAIKeyUseCase:
    def __init__(self, ai_api_key_repo: AIApiKeyRepository) -> None:
        self._ai_api_key_repo: AIApiKeyRepository = ai_api_key_repo

    async def execute(self, user_id: str, provider: str) -> bool:
        return await self._ai_api_key_repo.delete_by_user_and_provider(user_id, provider)
