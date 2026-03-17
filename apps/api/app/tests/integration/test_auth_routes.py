from __future__ import annotations

import importlib
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.core.security import create_refresh_token, decrypt_token
from app.infrastructure.db.repositories import SQLiteIdentityRepository, SQLiteUserRepository

jwt = importlib.import_module("jwt")


@pytest.mark.asyncio
async def test_start_github_oauth_returns_authorize_url_and_state(client: AsyncClient) -> None:
    response = await client.post("/api/v1/auth/github")

    assert response.status_code == 200
    payload = response.json()
    assert "state" in payload
    assert payload["state"]
    assert "authorize_url" in payload
    assert "client_id=" in payload["authorize_url"]
    assert f"redirect_uri={settings.github_redirect_uri}" in payload["authorize_url"]


@pytest.mark.asyncio
async def test_github_callback_creates_new_user_on_first_login(
    client: AsyncClient,
    mock_github,
    db,
) -> None:
    start = await client.post("/api/v1/auth/github")
    state = start.json()["state"]

    mock_github.exchange_code.return_value = {"access_token": "gh-token"}
    mock_github.get_user.return_value = {
        "id": 999999,
        "login": "new-user",
        "name": "New User",
        "email": None,
        "avatar_url": "https://avatars.example/new-user.png",
    }
    mock_github.get_user_emails.return_value = [{"email": "new-user@example.com", "primary": True}]

    response = await client.get(
        "/api/v1/auth/github/callback",
        params={"code": "oauth-code", "state": state},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert payload["access_token"]
    assert payload["refresh_token"]
    assert payload["user"]["github_username"] == "new-user"
    assert payload["user"]["email"] == "new-user@example.com"

    repo = SQLiteUserRepository(db)
    created = await repo.find_by_github_id("999999")
    assert created is not None
    assert created.display_name == "New User"
    assert created.avatar_url == "https://avatars.example/new-user.png"


@pytest.mark.asyncio
async def test_github_callback_updates_existing_user_on_relogin(
    client: AsyncClient,
    mock_github,
    test_user,
    db,
) -> None:
    start = await client.post("/api/v1/auth/github")
    state = start.json()["state"]

    mock_github.exchange_code.return_value = {"access_token": "updated-token"}
    mock_github.get_user.return_value = {
        "id": int(test_user.github_id),
        "login": "updated-user",
        "name": "Updated Name",
        "email": None,
        "avatar_url": "https://avatars.example/updated.png",
    }
    mock_github.get_user_emails.return_value = [{"email": "updated@example.com", "primary": True}]

    response = await client.get(
        "/api/v1/auth/github/callback",
        params={"code": "oauth-code", "state": state},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["id"] == test_user.id
    assert payload["user"]["github_username"] == "updated-user"
    assert payload["user"]["display_name"] == "Updated Name"
    assert payload["user"]["email"] == "updated@example.com"

    repo = SQLiteUserRepository(db)
    updated = await repo.find_by_id(test_user.id)
    assert updated is not None
    assert updated.github_username == "updated-user"
    assert updated.display_name == "Updated Name"
    assert updated.email == "updated@example.com"


@pytest.mark.asyncio
async def test_github_callback_stores_encrypted_access_token(
    client: AsyncClient,
    mock_github,
    db,
) -> None:
    start = await client.post("/api/v1/auth/github")
    state = start.json()["state"]

    mock_github.exchange_code.return_value = {"access_token": "gh-secret-token"}
    mock_github.get_user.return_value = {
        "id": 777777,
        "login": "token-test-user",
        "name": "Token Test",
        "email": None,
        "avatar_url": None,
    }
    mock_github.get_user_emails.return_value = [
        {"email": "token-test@example.com", "primary": True}
    ]

    response = await client.get(
        "/api/v1/auth/github/callback",
        params={"code": "oauth-code", "state": state},
    )
    assert response.status_code == 200

    identity_repo = SQLiteIdentityRepository(db)
    identities = await identity_repo.find_by_user_id(response.json()["user"]["id"])
    github_identity = next((i for i in identities if i.provider == "github"), None)

    assert github_identity is not None
    assert github_identity.encrypted_access_token is not None
    assert github_identity.access_token_hash is not None
    decrypted = decrypt_token(github_identity.encrypted_access_token)
    assert decrypted == "gh-secret-token"


@pytest.mark.asyncio
async def test_github_callback_rejects_invalid_state(client: AsyncClient) -> None:
    response = await client.get(
        "/api/v1/auth/github/callback",
        params={"code": "oauth-code", "state": "bad-state"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_logout_authenticated_returns_success(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    response = await client.post("/api/v1/auth/logout", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == {"message": "Logged out successfully"}


@pytest.mark.asyncio
async def test_logout_without_auth_returns_401(client: AsyncClient) -> None:
    response = await client.post("/api/v1/auth/logout")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_get_me_authenticated_returns_user(
    client: AsyncClient,
    auth_headers: dict[str, str],
    test_user,
) -> None:
    response = await client.get("/api/v1/auth/me", headers=auth_headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == test_user.id
    assert payload["github_username"] == test_user.github_username
    assert payload["email"] == test_user.email


@pytest.mark.asyncio
async def test_get_me_without_auth_returns_401(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_get_me_with_invalid_token_returns_401(client: AsyncClient) -> None:
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_refresh_with_valid_refresh_token_returns_new_access_token(
    client: AsyncClient,
    test_user,
) -> None:
    refresh_token = create_refresh_token(test_user.id)

    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert payload["access_token"]


@pytest.mark.asyncio
async def test_refresh_with_invalid_refresh_token_returns_401(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "not-a-token"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_refresh_with_expired_refresh_token_returns_401(client: AsyncClient) -> None:
    now = datetime.now(timezone.utc)
    expired_token = jwt.encode(
        {
            "sub": "user-id",
            "iat": now - timedelta(hours=2),
            "exp": now - timedelta(hours=1),
            "type": "refresh",
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )

    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": expired_token},
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"
