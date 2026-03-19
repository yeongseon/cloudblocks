"""Encrypted API key management for LLM providers."""

from __future__ import annotations

import importlib


class KeyManager:
    def __init__(self, encryption_key: str):
        fernet_class = importlib.import_module("cryptography.fernet").Fernet
        if not encryption_key:
            encryption_key = fernet_class.generate_key().decode()
        self._fernet = fernet_class(
            encryption_key.encode() if isinstance(encryption_key, str) else encryption_key
        )

    def encrypt(self, plaintext_key: str) -> str:
        return self._fernet.encrypt(plaintext_key.encode()).decode()

    def decrypt(self, encrypted_key: str) -> str:
        return self._fernet.decrypt(encrypted_key.encode()).decode()
