"""CloudBlocks API - Session security utilities."""

from __future__ import annotations

import base64
import hashlib
import json as json_module
import secrets
import uuid
from collections.abc import Mapping

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


def generate_session_token() -> str:
    """Generate a cryptographically secure session token."""
    return secrets.token_urlsafe(32)


def encrypt_oauth_state(state_data: Mapping[str, object]) -> str:
    """Encrypt OAuth state data for cookie storage using Fernet."""
    f = Fernet(_derive_fernet_key())
    json_bytes = json_module.dumps(state_data).encode()
    return f.encrypt(json_bytes).decode()


def decrypt_oauth_state(encrypted: str) -> dict[str, int | str] | None:
    """Decrypt OAuth state from cookie. Returns None if invalid/expired."""
    f = Fernet(_derive_fernet_key())
    try:
        decrypted = f.decrypt(encrypted.encode())
        return json_module.loads(decrypted.decode())
    except (InvalidToken, json_module.JSONDecodeError, UnicodeDecodeError):
        return None

