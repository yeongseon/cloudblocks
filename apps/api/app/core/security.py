"""CloudBlocks API - JWT authentication service."""

from __future__ import annotations

import base64
import hashlib
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.core.config import settings
from app.core.errors import UnauthorizedError


def generate_id() -> str:
    """Generate a short unique ID."""
    return uuid.uuid4().hex[:12]


def hash_token(token: str) -> str:
    """Hash an OAuth token for storage (SHA-256)."""
    return hashlib.sha256(token.encode()).hexdigest()


def _derive_fernet_key() -> bytes:
    """Derive a Fernet-compatible key from JWT secret + salt using PBKDF2."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=settings.token_encryption_salt.encode(),
        iterations=480_000,
    )
    key = kdf.derive(settings.jwt_secret.encode())
    return base64.urlsafe_b64encode(key)


def encrypt_token(token: str) -> str:
    """Encrypt an OAuth token using Fernet. Returns base64-encoded ciphertext."""
    f = Fernet(_derive_fernet_key())
    return f.encrypt(token.encode()).decode()


def decrypt_token(encrypted: str) -> str:
    """Decrypt a Fernet-encrypted OAuth token. Raises UnauthorizedError on failure."""
    f = Fernet(_derive_fernet_key())
    try:
        return f.decrypt(encrypted.encode()).decode()
    except InvalidToken:
        raise UnauthorizedError("Failed to decrypt token - key may have rotated") from None


def create_access_token(user_id: str, extra_claims: dict | None = None) -> str:
    """Create a JWT access token."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(seconds=settings.jwt_expiration_seconds),
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: str) -> str:
    """Create a JWT refresh token (longer expiry)."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(seconds=settings.jwt_refresh_expiration_seconds),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str, expected_type: str = "access") -> dict:
    """Decode and validate a JWT token. Raises UnauthorizedError on failure."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError("Token has expired") from None
    except jwt.InvalidTokenError:
        raise UnauthorizedError("Invalid token") from None

    if payload.get("type") != expected_type:
        raise UnauthorizedError(f"Expected {expected_type} token")

    return payload
