"""CloudBlocks API - Authentication routes.

GitHub App OAuth flow with JWT session tokens.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.core.config import settings
from app.core.dependencies import (
    get_current_user,
    get_github_service,
    get_identity_repo,
    get_user_repo,
)
from app.core.errors import UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_id,
    hash_token,
)
from app.domain.models.entities import Identity, User
from app.domain.models.repositories import IdentityRepository, UserRepository
from app.infrastructure.github_service import GitHubService

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory state store for OAuth CSRF protection (replace with Redis in production)
_oauth_states: set[str] = set()


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    github_username: str | None
    email: str | None
    display_name: str | None
    avatar_url: str | None


@router.post("/github")
async def start_github_oauth(
    github: Annotated[GitHubService, Depends(get_github_service)],
) -> dict:
    """Start GitHub OAuth flow — returns the authorization URL."""
    state = uuid.uuid4().hex
    _oauth_states.add(state)
    url = github.get_authorize_url(settings.github_redirect_uri, state)
    return {"authorize_url": url, "state": state}


@router.get("/github/callback")
async def github_oauth_callback(
    code: Annotated[str, Query()],
    state: Annotated[str, Query()],
    github: Annotated[GitHubService, Depends(get_github_service)],
    user_repo: Annotated[UserRepository, Depends(get_user_repo)],
    identity_repo: Annotated[IdentityRepository, Depends(get_identity_repo)],
) -> AuthResponse:
    """Handle GitHub OAuth callback — exchange code for tokens, create/update user."""
    if state not in _oauth_states:
        raise UnauthorizedError("Invalid OAuth state")
    _oauth_states.discard(state)

    # Exchange code for GitHub access token
    token_data = await github.exchange_code(code)
    access_token = token_data["access_token"]

    # Get GitHub user profile
    gh_user = await github.get_user(access_token)
    github_id = str(gh_user["id"])

    # Get primary email
    emails = await github.get_user_emails(access_token)
    primary_email = next(
        (e["email"] for e in emails if e.get("primary")),
        gh_user.get("email"),
    )

    # Find or create user
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

    # Store/update identity with hashed access token
    identity = await identity_repo.find_by_provider("github", github_id)
    if identity:
        identity.access_token_hash = hash_token(access_token)
        await identity_repo.update(identity)
    else:
        identity = Identity(
            id=generate_id(),
            user_id=user.id,
            provider="github",
            provider_id=github_id,
            access_token_hash=hash_token(access_token),
        )
        await identity_repo.create(identity)

    # Create JWT tokens
    jwt_access = create_access_token(user.id)
    jwt_refresh = create_refresh_token(user.id)

    return AuthResponse(
        access_token=jwt_access,
        refresh_token=jwt_refresh,
        user={
            "id": user.id,
            "github_username": user.github_username,
            "email": user.email,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
        },
    )


@router.post("/logout")
async def logout(
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """Invalidate session. In a stateless JWT setup, the client discards the token."""
    return {"message": "Logged out successfully"}


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


@router.post("/refresh")
async def refresh_token(
    body: RefreshRequest,
    user_repo: Annotated[UserRepository, Depends(get_user_repo)],
) -> RefreshResponse:
    """Refresh an access token using a refresh token."""
    payload = decode_token(body.refresh_token, expected_type="refresh")
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Invalid refresh token")

    user = await user_repo.find_by_id(user_id)
    if not user:
        raise UnauthorizedError("User not found")

    new_access = create_access_token(user.id)
    return RefreshResponse(access_token=new_access)
