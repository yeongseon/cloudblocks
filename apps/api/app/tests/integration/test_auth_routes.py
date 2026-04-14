from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.core.security import decrypt_oauth_state, decrypt_token
from app.tests.helpers import with_cookies
from app.infrastructure.db.repositories import (
    SQLiteIdentityRepository,
    SQLiteSessionRepository,
    SQLiteUserRepository,
)


@pytest.mark.asyncio
async def test_start_github_oauth_returns_authorize_url_and_sets_cookie(
    client: AsyncClient,
) -> None:
    response = await client.post("/api/v1/auth/github")

    assert response.status_code == 200
    payload = response.json()
    assert "state" not in payload
    assert payload["authorize_url"]
    assert "cb_oauth" in response.cookies
    assert "cb_oauth=" in response.headers.get("set-cookie", "")


@pytest.mark.asyncio
async def test_github_callback_creates_new_user_and_sets_session_cookie(
    client: AsyncClient,
    mock_github,
    db,
) -> None:
    start = await client.post("/api/v1/auth/github")
    oauth_cookie = start.cookies.get("cb_oauth")
    assert oauth_cookie is not None
    state_data = decrypt_oauth_state(oauth_cookie)
    assert state_data is not None
    state = state_data["state"]
    assert oauth_cookie is not None

    mock_github.exchange_code.return_value = {"access_token": "gh-token"}
    mock_github.get_user.return_value = {
        "id": 999999,
        "login": "new-user",
        "name": "New User",
        "email": None,
        "avatar_url": "https://avatars.example/new-user.png",
    }
    mock_github.get_user_emails.return_value = [{"email": "new-user@example.com", "primary": True}]

    response = await with_cookies(client, {"cb_oauth": oauth_cookie}).get("/api/v1/auth/github/callback",
    params={"code": "oauth-code", "state": state}, follow_redirects=False,)

    assert response.status_code == 302
    assert response.headers["location"] == settings.frontend_url
    assert "cb_session" in response.cookies

    user = await SQLiteUserRepository(db).find_by_github_id("999999")
    assert user is not None
    identity = await SQLiteIdentityRepository(db).find_by_provider("github", "999999")
    assert identity is not None
    session_cookie = response.cookies.get("cb_session")
    assert session_cookie is not None
    session = await SQLiteSessionRepository(db).get_by_id(session_cookie)
    assert session is not None
    assert session.user_id == user.id


@pytest.mark.asyncio
async def test_github_callback_updates_existing_user_on_relogin(
    client: AsyncClient,
    mock_github,
    test_user,
    db,
) -> None:
    start = await client.post("/api/v1/auth/github")
    oauth_cookie = start.cookies.get("cb_oauth")
    assert oauth_cookie is not None
    state_data = decrypt_oauth_state(oauth_cookie)
    assert state_data is not None
    state = state_data["state"]
    assert oauth_cookie is not None

    mock_github.exchange_code.return_value = {"access_token": "updated-token"}
    mock_github.get_user.return_value = {
        "id": int(test_user.github_id),
        "login": "updated-user",
        "name": "Updated Name",
        "email": None,
        "avatar_url": "https://avatars.example/updated.png",
    }
    mock_github.get_user_emails.return_value = [{"email": "updated@example.com", "primary": True}]

    response = await with_cookies(client, {"cb_oauth": oauth_cookie}).get("/api/v1/auth/github/callback",
    params={"code": "oauth-code", "state": state}, follow_redirects=False,)

    assert response.status_code == 302
    assert "cb_session" in response.cookies

    updated = await SQLiteUserRepository(db).find_by_id(test_user.id)
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
    oauth_cookie = start.cookies.get("cb_oauth")
    assert oauth_cookie is not None
    state_data = decrypt_oauth_state(oauth_cookie)
    assert state_data is not None
    state = state_data["state"]

    mock_github.exchange_code.return_value = {"access_token": "gh-secret-token"}
    mock_github.get_user.return_value = {
        "id": 777777,
        "login": "token-test-user",
        "name": "Token Test",
        "email": None,
        "avatar_url": None,
    }
    mock_github.get_user_emails.return_value = [
        {"email": "token-test@example.com", "primary": True},
    ]

    response = await with_cookies(client, {"cb_oauth": oauth_cookie}).get("/api/v1/auth/github/callback",
    params={"code": "oauth-code", "state": state}, follow_redirects=False,)
    assert response.status_code == 302

    identity = await SQLiteIdentityRepository(db).find_by_provider("github", "777777")
    assert identity is not None
    assert identity.encrypted_access_token is not None
    assert decrypt_token(identity.encrypted_access_token) == "gh-secret-token"


@pytest.mark.asyncio
async def test_github_callback_rejects_invalid_state(client: AsyncClient, mock_github) -> None:
    start = await client.post("/api/v1/auth/github")
    oauth_cookie = start.cookies.get("cb_oauth")
    assert oauth_cookie is not None

    mock_github.exchange_code.return_value = {"access_token": "gh-token"}
    mock_github.get_user.return_value = {"id": 1, "login": "u", "name": "u", "email": None}
    mock_github.get_user_emails.return_value = [{"email": "u@example.com", "primary": True}]

    response = await with_cookies(client, {"cb_oauth": oauth_cookie}).get("/api/v1/auth/github/callback",
    params={"code": "oauth-code", "state": "bad-state"}, follow_redirects=False,)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_github_callback_rejects_missing_oauth_cookie(client: AsyncClient) -> None:
    response = await client.get(
        "/api/v1/auth/github/callback",
        params={"code": "oauth-code", "state": "any-state"},
        follow_redirects=False,
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_session_endpoint_returns_user_for_valid_session(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    test_user,
) -> None:
    response = await with_cookies(client, auth_cookies).get("/api/v1/auth/session")

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == test_user.id
    assert payload["github_username"] == test_user.github_username
    assert payload["email"] == test_user.email


@pytest.mark.asyncio
async def test_session_endpoint_returns_401_without_cookie(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/session")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_session_endpoint_returns_401_for_invalid_session(
    client: AsyncClient,
) -> None:
    response = await with_cookies(client, {"cb_session": "invalid-session-token"}).get("/api/v1/auth/session", )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_logout_with_session_revokes_and_clears_cookie(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    db,
) -> None:
    session_token = auth_cookies["cb_session"]

    response = await with_cookies(client, auth_cookies).post("/api/v1/auth/logout")

    assert response.status_code == 200
    assert response.json() == {"message": "Logged out successfully"}
    session = await SQLiteSessionRepository(db).get_by_id(session_token)
    assert session is not None
    assert session.revoked_at is not None
    assert "cb_session=" in response.headers.get("set-cookie", "")


@pytest.mark.asyncio
async def test_logout_without_session_returns_200(client: AsyncClient) -> None:
    response = await client.post("/api/v1/auth/logout")

    assert response.status_code == 200
    assert response.json() == {"message": "Logged out successfully"}


@pytest.mark.asyncio
async def test_get_me_with_session_returns_user(
    client: AsyncClient,
    auth_cookies: dict[str, str],
    test_user,
) -> None:
    response = await with_cookies(client, auth_cookies).get("/api/v1/auth/me")

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == test_user.id
    assert payload["github_username"] == test_user.github_username
    assert payload["email"] == test_user.email


@pytest.mark.asyncio
async def test_get_me_without_session_returns_401(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"
