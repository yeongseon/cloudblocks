from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from typing import cast

import jwt
import pytest

from app.core import security
from app.core.config import settings
from app.core.errors import UnauthorizedError

Payload = dict[str, object]

_create_access_token = cast(
    Callable[[str, dict[str, object] | None], str],
    security.create_access_token,
)
_decode_token = cast(
    Callable[[str, str], dict[str, object]],
    security.decode_token,
)


def generate_id() -> str:
    return security.generate_id()


def hash_token(token: str) -> str:
    return security.hash_token(token)


def create_access_token(user_id: str, extra_claims: Payload | None = None) -> str:
    return _create_access_token(user_id, extra_claims)


def create_refresh_token(user_id: str) -> str:
    return security.create_refresh_token(user_id)


def decode_token(token: str, expected_type: str = "access") -> Payload:
    return dict(_decode_token(token, expected_type))


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


def test_create_access_token_contains_expected_claims_with_extra_claims() -> None:
    token = create_access_token("user-1", {"role": "admin"})
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])

    assert isinstance(token, str)
    assert payload["sub"] == "user-1"
    assert payload["type"] == "access"
    assert payload["role"] == "admin"
    assert payload["exp"] > payload["iat"]


def test_create_refresh_token_contains_expected_claims() -> None:
    token = create_refresh_token("user-2")
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])

    assert isinstance(token, str)
    assert payload["sub"] == "user-2"
    assert payload["type"] == "refresh"
    assert payload["exp"] > payload["iat"]


def test_decode_token_with_valid_access_and_refresh_tokens() -> None:
    access = create_access_token("user-a")
    refresh = create_refresh_token("user-r")

    access_payload = decode_token(access, "access")
    refresh_payload = decode_token(refresh, "refresh")

    assert access_payload["sub"] == "user-a"
    assert access_payload["type"] == "access"
    assert refresh_payload["sub"] == "user-r"
    assert refresh_payload["type"] == "refresh"


def test_decode_token_raises_unauthorized_for_expired_token() -> None:
    expired_payload = {
        "sub": "user-expired",
        "iat": datetime.now(timezone.utc) - timedelta(hours=2),
        "exp": datetime.now(timezone.utc) - timedelta(hours=1),
        "type": "access",
    }
    token = jwt.encode(expired_payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    with pytest.raises(UnauthorizedError, match="Token has expired"):
        _ = decode_token(token)


def test_decode_token_raises_unauthorized_for_invalid_token_string() -> None:
    with pytest.raises(UnauthorizedError, match="Invalid token"):
        _ = decode_token("not-a-jwt")


def test_decode_token_raises_unauthorized_for_wrong_expected_type() -> None:
    access = create_access_token("user-type")

    with pytest.raises(UnauthorizedError, match="Expected refresh token"):
        _ = decode_token(access, "refresh")
