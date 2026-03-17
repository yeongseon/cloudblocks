from __future__ import annotations

import pytest

from app.core import security
from app.core.errors import UnauthorizedError


def generate_id() -> str:
    return security.generate_id()


def hash_token(token: str) -> str:
    return security.hash_token(token)
def test_generate_id_returns_12_char_hex_and_unique_values() -> None:
    first = generate_id()
    second = generate_id()

    assert len(first) == 12
    assert len(second) == 12
    _ = int(first, 16)
    _ = int(second, 16)
    assert first != second


def test_hash_token_is_sha256_and_deterministic() -> None:
    source = "my-token"
    same_source = "my-token"
    other_source = "other-token"

    digest_a = hash_token(source)
    digest_b = hash_token(same_source)
    digest_c = hash_token(other_source)

    assert len(digest_a) == 64
    _ = int(digest_a, 16)
    assert digest_a == digest_b
    assert digest_a != digest_c



def test_encrypt_token_returns_encrypted_string() -> None:
    encrypted = security.encrypt_token("test-token")

    assert encrypted != "test-token"
    assert isinstance(encrypted, str)


def test_decrypt_token_returns_original_value() -> None:
    original = "my-github-token-12345"
    encrypted = security.encrypt_token(original)
    decrypted = security.decrypt_token(encrypted)

    assert decrypted == original


def test_decrypt_token_raises_unauthorized_for_invalid_input() -> None:
    with pytest.raises(UnauthorizedError, match="Failed to decrypt"):
        security.decrypt_token("not-a-valid-encrypted-token")


def test_encrypt_decrypt_round_trip_with_special_characters() -> None:
    tokens = ["gho_abc123XYZ", "ghp_some/token+value=", "token with spaces"]

    for token in tokens:
        encrypted = security.encrypt_token(token)
        assert security.decrypt_token(encrypted) == token


def test_generate_session_token_returns_url_safe_string() -> None:
    first = security.generate_session_token()
    second = security.generate_session_token()

    assert isinstance(first, str)
    assert isinstance(second, str)
    assert first
    assert second
    assert first != second


def test_encrypt_oauth_state_returns_encrypted_string() -> None:
    state_data = {"state": "abc123", "created_at": 1_700_000_000}

    encrypted = security.encrypt_oauth_state(state_data)

    assert isinstance(encrypted, str)
    assert encrypted
    assert encrypted != str(state_data)
    assert "abc123" not in encrypted


def test_decrypt_oauth_state_returns_original_data() -> None:
    state_data = {"state": "oauth-state", "created_at": 1_700_123_456}

    encrypted = security.encrypt_oauth_state(state_data)
    decrypted = security.decrypt_oauth_state(encrypted)

    assert decrypted == state_data


def test_decrypt_oauth_state_returns_none_for_invalid_input() -> None:
    assert security.decrypt_oauth_state("garbage-value") is None


def test_encrypt_decrypt_oauth_state_with_various_data() -> None:
    samples = [
        {"state": "s1", "created_at": 1},
        {"state": "s-2", "created_at": 1_700_000_000, "nonce": "xyz"},
        {"state": "s3", "created_at": "1700000010", "meta": "info"},
    ]

    for sample in samples:
        encrypted = security.encrypt_oauth_state(sample)
        assert security.decrypt_oauth_state(encrypted) == sample
