"""CloudBlocks API - Authentication routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel

from app.core.config import settings
from app.core.dependencies import (
    get_current_user,
    get_github_service,
    get_identity_repo,
    get_session_repo,
    get_user_repo,
)
from app.core.errors import UnauthorizedError
from app.core.security import (
    decrypt_oauth_state,
    encrypt_oauth_state,
    encrypt_token,
    generate_id,
    generate_session_token,
    hash_token,
)
from app.domain.models.entities import Identity, Session, User
from app.domain.models.repositories import IdentityRepository, SessionRepository, UserRepository
from app.infrastructure.github_service import GitHubService

router = APIRouter(prefix="/auth", tags=["auth"])


class UserResponse(BaseModel):
    id: str
    github_username: str | None
    email: str | None
    display_name: str | None
    avatar_url: str | None


@router.post("/github")
async def start_github_oauth(
    github: Annotated[GitHubService, Depends(get_github_service)],
) -> JSONResponse:
    import time as time_mod

    state = generate_session_token()
    state_data = {"state": state, "created_at": int(time_mod.time())}
    encrypted = encrypt_oauth_state(state_data)

    url = github.get_authorize_url(settings.github_redirect_uri, state)

    response = JSONResponse(content={"authorize_url": url})
    response.set_cookie(
        key=settings.oauth_cookie_name,
        value=encrypted,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        max_age=settings.oauth_state_ttl_minutes * 60,
        path=settings.session_cookie_path,
    )
    return response


@router.get("/github/callback")
async def github_oauth_callback(
    code: Annotated[str, Query()],
    state: Annotated[str, Query()],
    request: Request,
    github: Annotated[GitHubService, Depends(get_github_service)],
    user_repo: Annotated[UserRepository, Depends(get_user_repo)],
    identity_repo: Annotated[IdentityRepository, Depends(get_identity_repo)],
    session_repo: Annotated[SessionRepository, Depends(get_session_repo)],
) -> RedirectResponse:
    import time as time_mod

    encrypted_state = request.cookies.get(settings.oauth_cookie_name)
    if not encrypted_state:
        raise UnauthorizedError("Missing OAuth state cookie")

    state_data = decrypt_oauth_state(encrypted_state)
    if not state_data or state_data.get("state") != state:
        raise UnauthorizedError("Invalid OAuth state")

    created_raw = state_data.get("created_at", 0)
    created_at = int(created_raw) if isinstance(created_raw, (int, str)) else 0
    if int(time_mod.time()) - created_at > settings.oauth_state_ttl_minutes * 60:
        raise UnauthorizedError("OAuth state expired")

    token_data = await github.exchange_code(code)
    access_token = token_data["access_token"]

    gh_user = await github.get_user(access_token)
    github_id = str(gh_user["id"])

    emails = await github.get_user_emails(access_token)
    primary_email = next(
        (e["email"] for e in emails if e.get("primary")),
        gh_user.get("email"),
    )

    user = await user_repo.find_by_github_id(github_id)
    if user:
        user.github_username = gh_user.get("login")
        user.email = primary_email
        user.display_name = gh_user.get("name") or gh_user.get("login")
        user.avatar_url = gh_user.get("avatar_url")
        user = await user_repo.update(user)
    else:
        user = User(
            id=generate_id(),
            github_id=github_id,
            github_username=gh_user.get("login"),
            email=primary_email,
            display_name=gh_user.get("name") or gh_user.get("login"),
            avatar_url=gh_user.get("avatar_url"),
        )
        user = await user_repo.create(user)

    identity = await identity_repo.find_by_provider("github", github_id)
    if identity:
        identity.access_token_hash = hash_token(access_token)
        identity.encrypted_access_token = encrypt_token(access_token)
        await identity_repo.update(identity)
    else:
        identity = Identity(
            id=generate_id(),
            user_id=user.id,
            provider="github",
            provider_id=github_id,
            access_token_hash=hash_token(access_token),
            encrypted_access_token=encrypt_token(access_token),
        )
        await identity_repo.create(identity)

    now = int(time_mod.time())
    session_token = generate_session_token()
    session = Session(
        id=session_token,
        user_id=user.id,
        created_at=now,
        expires_at=now + settings.session_ttl_hours * 3600,
    )
    await session_repo.create(session)

    response = RedirectResponse(url=settings.frontend_url, status_code=302)
    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_token,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        max_age=settings.session_ttl_hours * 3600,
        path=settings.session_cookie_path,
        domain=settings.session_cookie_domain,
    )
    response.delete_cookie(
        key=settings.oauth_cookie_name,
        path=settings.session_cookie_path,
    )
    return response


@router.get("/session")
async def get_session(
    request: Request,
    session_repo: Annotated[SessionRepository, Depends(get_session_repo)],
    user_repo: Annotated[UserRepository, Depends(get_user_repo)],
) -> UserResponse:
    """Bootstrap endpoint - returns current user if session cookie is valid."""
    import time as time_mod

    session_token = request.cookies.get(settings.session_cookie_name)
    if not session_token:
        raise UnauthorizedError("No active session")

    session = await session_repo.get_by_id(session_token)
    if not session:
        raise UnauthorizedError("Invalid session")

    now = int(time_mod.time())
    if session.expires_at < now:
        raise UnauthorizedError("Session expired")
    if session.revoked_at is not None:
        raise UnauthorizedError("Session revoked")

    await session_repo.update_last_seen(session.id, now)

    user = await user_repo.find_by_id(session.user_id)
    if not user:
        raise UnauthorizedError("User not found")

    return UserResponse(
        id=user.id,
        github_username=user.github_username,
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
    )


@router.post("/logout")
async def logout(
    request: Request,
    session_repo: Annotated[SessionRepository, Depends(get_session_repo)],
) -> JSONResponse:
    """Revoke session and clear cookie. Always returns 200."""
    session_token = request.cookies.get(settings.session_cookie_name)
    if session_token:
        existing = await session_repo.get_by_id(session_token)
        if existing and existing.revoked_at is None:
            await session_repo.revoke(existing.id)

    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie(
        key=settings.session_cookie_name,
        path=settings.session_cookie_path,
        domain=settings.session_cookie_domain,
    )
    return response


@router.get("/me")
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """Get the current authenticated user."""
    return UserResponse(
        id=current_user.id,
        github_username=current_user.github_username,
        email=current_user.email,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
    )
