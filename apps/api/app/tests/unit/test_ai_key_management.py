from __future__ import annotations

import importlib

KeyManager = importlib.import_module("app.infrastructure.llm.key_manager").KeyManager


def test_encrypt_returns_different_string_than_input() -> None:
    manager = KeyManager("")
    plaintext = "sk-test-secret"

    encrypted = manager.encrypt(plaintext)
    assert encrypted != plaintext


def test_decrypt_round_trip_returns_original_value() -> None:
    manager = KeyManager("")
    plaintext = "sk-test-secret"

    encrypted = manager.encrypt(plaintext)
    decrypted = manager.decrypt(encrypted)

    assert decrypted == plaintext


def test_encrypting_different_keys_produces_different_outputs() -> None:
    manager = KeyManager("")

    encrypted_first = manager.encrypt("sk-first")
    encrypted_second = manager.encrypt("sk-second")

    assert encrypted_first != encrypted_second


def test_empty_encryption_key_generates_working_fernet_key() -> None:
    manager = KeyManager("")

    encrypted = manager.encrypt("sk-generated-key")

    assert manager.decrypt(encrypted) == "sk-generated-key"
